#!/usr/bin/env node
/**
 * Throwaway filler generator. Pulls real text and images from Wikipedia so the
 * viewer can be judged against realistic content.
 *
 * This is NOT the content pipeline. It curates nothing, verifies nothing, and
 * calls no model. It exists only so the week of use means something.
 *
 * IDEA.md calls for roughly 20-30 cards a day — long enough to be a real session,
 * not a twenty-second scroll. Every article here yields several cards (see
 * CARDS_PER_ARTICLE), and the register rotation runs over the day's running card
 * count, not the article count, so neighbouring cards keep alternating even
 * across an article boundary.
 *
 * Usage: npm run filler
 */

import { writeFileSync } from "node:fs";

const API = "https://en.wikipedia.org/api/rest_v1/page/summary/";
const FILE = (name) =>
  `https://commons.wikimedia.org/wiki/Special:FilePath/${name}?width=760`;

// Seven days, each drawn from several articles so no day is one article walked down.
// Titles verified against the live REST summary API on 2026-09-14 (a second pass,
// after the 2026-09-13 pass that covered the original four-per-day PLAN): every
// title below returned 200, and no two titles in the same day resolve to the same
// underlying article. "Menswear" and "Huntsman_(clothing)" are still excluded from
// Wednesday/Friday for the reasons noted below. Also excluded this pass (all 404 on
// the live API): "Interfacing_(sewing)", "Ethical_fashion", "Kilgour_(tailor)",
// "Huntsman_(tailor)". "Lounge_suit" was excluded too — it redirects to "Suit", the
// same article Monday already uses, and reusing it on Tuesday would be redundant
// even though it lives on a different day. Re-verify with the API before adding a
// title, not after.
//
// Eight articles per day (not seven): buildDay below now sometimes drops a card
// when an article's extract is too short to cut into enough distinct text, so this
// extra article is slack that keeps every day comfortably past MIN_CARDS = 18 even
// after a few such drops.
const PLAN = [
  {
    day: "monday",
    slot: "The map",
    articles: ["Suit_(clothing)", "Suit_jacket", "Waistcoat", "Necktie", "Dress_shirt", "Trousers", "Lapel", "Cufflink"],
  },
  {
    day: "tuesday",
    slot: "Origins",
    articles: [
      "Savile_Row",
      "Frock_coat",
      "Beau_Brummell",
      "Dandy",
      "Morning_dress",
      "Top_hat",
      "Victorian_fashion",
      "Gentleman",
    ],
  },
  {
    day: "wednesday",
    slot: "Mechanics",
    // Titles verified against the API on 2026-09-13. "Menswear" and "Huntsman_(clothing)"
    // were replaced: the first redirects to Fashion (duplicating this day's third article),
    // the second 404s. Re-verify with the API before adding a title, not after.
    articles: [
      "Bespoke_tailoring",
      "Wool",
      "Tailor",
      "Pattern_(sewing)",
      "Sewing_machine",
      "Lining_(sewing)",
      "Buttonhole",
      "Selvage",
    ],
  },
  {
    day: "thursday",
    slot: "The arguments",
    articles: [
      "Made_to_measure",
      "Off-the-peg",
      "Fashion",
      "Slim-fit_pants",
      "Fast_fashion",
      "Sustainable_fashion",
      "Slow_fashion",
      "History_of_Western_fashion",
    ],
  },
  {
    day: "friday",
    slot: "Primary sources",
    articles: [
      "Henry_Poole_%26_Co",
      "Gieves_%26_Hawkes",
      "Anderson_%26_Sheppard",
      "H._Huntsman_%26_Sons",
      "Dege_%26_Skinner",
      "Ede_%26_Ravenscroft",
      "Norton_%26_Sons",
    ],
  },
  {
    day: "saturday",
    slot: "The frontier",
    articles: [
      "Business_casual",
      "Smart_casual",
      "Workwear",
      "Casual_Friday",
      "Athleisure",
      "Streetwear",
      "Normcore",
    ],
  },
  {
    day: "sunday",
    slot: "Recall",
    articles: [
      "Suit_(clothing)",
      "Savile_Row",
      "Bespoke_tailoring",
      "Fashion",
      "Henry_Poole_%26_Co",
      "Business_casual",
      "Necktie",
      "Streetwear",
    ],
  },
];

async function summary(title) {
  const res = await fetch(API + title, {
    headers: { "User-Agent": "Specter/0.1 (personal project; filler generation)" },
  });
  if (!res.ok) return null;
  const d = await res.json();
  const image = d.originalimage?.source ?? d.thumbnail?.source ?? null;
  return {
    title: d.title,
    extract: d.extract ?? "",
    url: d.content_urls?.desktop?.page ?? `https://en.wikipedia.org/wiki/${title}`,
    image: image ? image.split("?")[0] : null,
  };
}

/**
 * Split into sentences, folding any fragment shorter than ~15 characters into the
 * sentence that follows. Without this, an abbreviation like "H." (from "H. Huntsman
 * & Sons") becomes its own two-character "sentence" and an absurdly short excerpt.
 */
function splitSentences(text) {
  const raw = text.match(/[^.!?]+[.!?]+/g) ?? [text];
  const merged = [];
  for (const part of raw) {
    if (merged.length > 0 && merged[merged.length - 1].trim().length < 15) {
      merged[merged.length - 1] += part;
    } else {
      merged.push(part);
    }
  }
  return merged;
}

/** Below this length a text card reads as near-empty (see IMAGE_LED_MAX_CHARS in
 * lib/variety.ts) — slices are kept at or above it so only the deliberate mode-2
 * card is ever that short. */
const MIN_SLICE_CHARS = 45;

/**
 * Partition an extract's sentences into up to `n` distinct, non-overlapping,
 * ordered windows — used to cut several genuinely different excerpts from one
 * article instead of overlapping prefixes that collide on short extracts (e.g.
 * "first 4 sentences" and "first 2 sentences" are identical text when there are
 * only 2). Each window keeps absorbing sentences until it clears
 * MIN_SLICE_CHARS, so a short trailing sentence gets folded into its neighbour
 * instead of shipping as its own near-empty card. Returns fewer than `n` windows
 * when the extract doesn't have enough sentences to fill them all distinctly —
 * callers must draw fewer text cards from this article rather than force a
 * duplicate or a near-empty one.
 */
function distinctSlices(parts, n) {
  if (n <= 0 || parts.length === 0) return [];

  const groups = [];
  let idx = 0;
  for (let g = 0; g < n && idx < parts.length; g++) {
    const isLastGroup = g === n - 1;
    let text = parts[idx];
    idx++;
    while (idx < parts.length && (isLastGroup || text.trim().length < MIN_SLICE_CHARS)) {
      text += parts[idx];
      idx++;
    }
    groups.push(text.trim());
  }

  // The final group absorbs "everything left", which can still be short when the
  // extract ran out early. Fold it into the previous group rather than ship a
  // near-empty trailing card.
  while (groups.length >= 2 && groups[groups.length - 1].length < MIN_SLICE_CHARS) {
    const last = groups.pop();
    groups[groups.length - 1] += " " + last;
  }

  return groups;
}

const EXTRA_IMAGES = [
  FILE("Waistcoat.jpg"),
  FILE("Memphis_tie_1A.JPG"),
  FILE("TailoringFirstFitFront01.jpg"),
  FILE("Savile_Row_from_Burlington_Gardens.jpg"),
];

// A Wikipedia summary is long enough to cut into several distinct cards, which is how
// an 8-article day turns into a 20+ card day instead of an 8-card one.
const CARDS_PER_ARTICLE = 3;

function buildDay({ day, slot, articles }, pages) {
  const cards = [];

  // Running card count for the whole day — NOT the article index. Rotating the
  // register off this keeps adjacent cards alternating (long, carousel, image-led,
  // short carousel) even across an article boundary, instead of resetting to the
  // same mode at the start of every article.
  let i = 0;

  pages.forEach((p) => {
    if (!p) return;
    const media = p.image ? [p.image] : [EXTRA_IMAGES[i % EXTRA_IMAGES.length]];
    const parts = splitSentences(p.extract);

    // Look ahead at the three modes this article is about to occupy, and count how
    // many of them are NOT the deliberate image-led mode (2) — that's how many
    // genuinely distinct text excerpts this article needs to supply.
    const upcomingModes = [i % 4, (i + 1) % 4, (i + 2) % 4];
    const textModesNeeded = upcomingModes.filter((m) => m !== 2).length;
    const slices = distinctSlices(parts, textModesNeeded);

    let textSlot = 0;
    for (let n = 0; n < CARDS_PER_ARTICLE; n++) {
      // Two of the four modes are carousels, so any run of 4+ cards clears
      // MIN_CAROUSELS = 2; every 8-article day comfortably clears both that and
      // MIN_CARDS = 18 once CARDS_PER_ARTICLE multiplies it out.
      const mode = i % 4;

      if (mode !== 2 && textSlot >= slices.length) {
        // This article's extract can't honestly support another distinct text
        // card — skip it rather than emit a blank or a repeat. The extra article
        // in each day's PLAN is exactly the slack that keeps the day's total past
        // MIN_CARDS despite the occasional skip like this one.
        i++;
        continue;
      }

      let excerpt;
      let detail;
      let connector;
      let cardMedia = media;

      if (mode === 0) {
        excerpt = slices[textSlot++];
        detail = `${p.title} · lead`;
        connector = `Where ${slot.toLowerCase()} starts.`;
      } else if (mode === 1) {
        // Filtered, not sliced: when p.image is null the fallback above already came
        // from EXTRA_IMAGES, and a repeat would collide as a React key in Carousel.
        const extras = EXTRA_IMAGES.filter((u) => !media.includes(u)).slice(0, 2);
        excerpt = slices[textSlot++];
        detail = `${p.title} · in parts`;
        connector = "Swipe sideways — one idea, several parts.";
        cardMedia = [...media, ...extras];
      } else if (mode === 2) {
        excerpt = ""; // deliberate — the image-led card. Do not touch.
        detail = p.title;
        connector = "Look before you read.";
      } else {
        // Found by scanning, not by index arithmetic: with several cards per
        // article, `i` at this point has drifted from the `i` used to pick
        // `media`'s fallback above, so a fixed offset like `(i + 2) % 4` can
        // land back on the same entry (this shipped as a real duplicate-media
        // bug once CARDS_PER_ARTICLE > 1). Scanning for an image not already in
        // `media` is correct regardless of how far `i` has moved.
        const extra = EXTRA_IMAGES.find((u) => !media.includes(u)) ?? EXTRA_IMAGES[0];
        excerpt = slices[textSlot++];
        detail = `${p.title} · two views`;
        connector = "One line, two views, then on.";
        cardMedia = [...media, extra];
      }

      cards.push({
        source: "Wikipedia",
        domain: "en.wikipedia.org",
        detail,
        url: p.url,
        media: cardMedia,
        excerpt,
        connector,
      });

      i++;
    }
  });

  return { day, slot, cards };
}

const days = [];
for (const entry of PLAN) {
  const pages = await Promise.all(entry.articles.map(summary));
  days.push(buildDay(entry, pages));
  process.stdout.write(
    `${entry.day}: ${pages.filter(Boolean).length} articles, ${days[days.length - 1].cards.length} cards\n`,
  );
}

const deck = { topic: "Suits", week: 1, days };
writeFileSync("content/suits.json", JSON.stringify(deck, null, 2) + "\n");
console.log("wrote content/suits.json");
