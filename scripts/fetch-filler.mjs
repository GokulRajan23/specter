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
const PLAN = [
  {
    day: "monday",
    slot: "The map",
    articles: ["Suit_(clothing)", "Suit_jacket", "Waistcoat", "Necktie", "Dress_shirt", "Trousers", "Lapel"],
  },
  {
    day: "tuesday",
    slot: "Origins",
    articles: ["Savile_Row", "Frock_coat", "Beau_Brummell", "Dandy", "Morning_dress", "Top_hat", "Victorian_fashion"],
  },
  {
    day: "wednesday",
    slot: "Mechanics",
    // Titles verified against the API on 2026-09-13. "Menswear" and "Huntsman_(clothing)"
    // were replaced: the first redirects to Fashion (duplicating this day's third article),
    // the second 404s. Re-verify with the API before adding a title, not after.
    articles: ["Bespoke_tailoring", "Wool", "Tailor", "Pattern_(sewing)", "Sewing_machine", "Lining_(sewing)", "Buttonhole"],
  },
  {
    day: "thursday",
    slot: "The arguments",
    articles: ["Made_to_measure", "Off-the-peg", "Fashion", "Slim-fit_pants", "Fast_fashion", "Sustainable_fashion", "Slow_fashion"],
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
    articles: ["Business_casual", "Smart_casual", "Workwear", "Casual_Friday", "Athleisure", "Streetwear", "Normcore"],
  },
  {
    day: "sunday",
    slot: "Recall",
    articles: ["Suit_(clothing)", "Savile_Row", "Bespoke_tailoring", "Fashion", "Henry_Poole_%26_Co", "Business_casual", "Necktie"],
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

/** Cut an extract to n sentences starting at `offset`, so lengths vary card to card. */
function sentences(text, n, offset = 0) {
  const parts = splitSentences(text);
  return parts.slice(offset, offset + n).join(" ").trim();
}

/** The article's closing sentence — a different slice than the opening, so a short
 * "two views" card doesn't just repeat the first few words of the lead card. */
function lastSentence(text) {
  const parts = splitSentences(text);
  return (parts[parts.length - 1] ?? "").trim();
}

const EXTRA_IMAGES = [
  FILE("Waistcoat.jpg"),
  FILE("Memphis_tie_1A.JPG"),
  FILE("TailoringFirstFitFront01.jpg"),
  FILE("Savile_Row_from_Burlington_Gardens.jpg"),
];

// A Wikipedia summary is long enough to cut into several distinct cards, which is how
// a 7-article day turns into a 20+ card day instead of a 7-card one.
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
    const usedExcerpts = new Set();

    for (let n = 0; n < CARDS_PER_ARTICLE; n++) {
      // Two of the four modes are carousels, so any run of 4+ cards clears
      // MIN_CAROUSELS = 2; every 7-article day comfortably clears both that and
      // MIN_CARDS = 18 once CARDS_PER_ARTICLE multiplies it out.
      const mode = i % 4;

      let excerpt;
      let detail;
      let connector;
      let cardMedia = media;

      if (mode === 0) {
        excerpt = sentences(p.extract, 4);
        detail = `${p.title} · lead`;
        connector = `Where ${slot.toLowerCase()} starts.`;
      } else if (mode === 1) {
        // Filtered, not sliced: when p.image is null the fallback above already came
        // from EXTRA_IMAGES, and a repeat would collide as a React key in Carousel.
        const extras = EXTRA_IMAGES.filter((u) => !media.includes(u)).slice(0, 2);
        excerpt = sentences(p.extract, 2, 1);
        detail = `${p.title} · in parts`;
        connector = "Swipe sideways — one idea, several parts.";
        cardMedia = [...media, ...extras];
      } else if (mode === 2) {
        excerpt = ""; // deliberate — the image-led card. Do not touch.
        detail = p.title;
        connector = "Look before you read.";
      } else {
        // (i + 2) % 4 never equals i % 4, so this extra image cannot duplicate the
        // fallback image chosen above. Duplicate URLs would collide as React keys.
        excerpt = lastSentence(p.extract);
        detail = `${p.title} · two views`;
        connector = "One line, two views, then on.";
        cardMedia = [...media, EXTRA_IMAGES[(i + 2) % EXTRA_IMAGES.length]];
      }

      // Multiple cards can be drawn from the same article; never let two of them
      // carry identical excerpt text (mode 2's deliberate "" is exempt from this —
      // it's allowed to recur, and re-checking it below is a no-op either way).
      if (mode !== 2) {
        if (excerpt && usedExcerpts.has(excerpt)) {
          excerpt = "";
        }
        usedExcerpts.add(excerpt);
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
