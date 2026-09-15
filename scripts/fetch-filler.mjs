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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * The REST summary API throttles bursts of anonymous requests with 429s. Retry
 * with backoff (honouring Retry-After when present) instead of silently
 * treating a rate limit as "no such article" and dropping a card.
 */
async function fetchWithRetry(url, options, attempts = 4) {
  let res;
  for (let attempt = 0; attempt < attempts; attempt++) {
    res = await fetch(url, options);
    if (res.status !== 429) return res;
    const retryAfter = Number(res.headers.get("retry-after"));
    const delay = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 2 ** attempt * 1000;
    await sleep(delay);
  }
  return res;
}

async function summary(title) {
  const res = await fetchWithRetry(API + title, {
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

/** Fetch a day's articles one at a time, with a small pause between requests,
 * rather than bursting them all at once — the burst is what triggers 429s in
 * the first place. */
async function summaryAll(titles) {
  const pages = [];
  for (const title of titles) {
    pages.push(await summary(title));
    await sleep(150);
  }
  return pages;
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

// Shared last-resort pool. Only used to pad a day that genuinely doesn't have
// enough of its own article images — see paddingPool in buildDay. Used alone,
// a 4-image pool padding half of every day's cards is exactly what put
// Waistcoat.jpg in 11 of Monday's 22 cards.
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

  // Every day's own fetched article images, tried before EXTRA_IMAGES — keeps
  // a day's filler photographically its own, and multiplies the pool from 4
  // shared images to (usually) 7-8 per day. EXTRA_IMAGES stays in the same
  // pool as a standing fallback (a day can have as few as 5 of its own
  // images, once some articles turn out to have none), but usage-based
  // selection below means it's only actually picked once the day's own
  // images are no longer the least-used option.
  const ownImages = pages.filter((p) => p && p.image).map((p) => p.image);
  const paddingPool = [...ownImages, ...EXTRA_IMAGES];

  // Tracks how many cards each image has appeared in — including an
  // article's own lead photo, reused across up to CARDS_PER_ARTICLE cards —
  // so padding picks can always favour whichever image has been used least.
  // A fixed rotation (the previous approach) still let one image dominate
  // when the pool was small relative to the day's card count; explicitly
  // balancing usage is what actually keeps every image under variety.ts's
  // MAX_IMAGE_SHARE regardless of how many of a day's articles have images.
  const usage = new Map();
  function bump(urls) {
    for (const u of new Set(urls)) usage.set(u, (usage.get(u) ?? 0) + 1);
  }

  // An own (or borrowed, see below) image is guaranteed to be reused across up
  // to CARDS_PER_ARTICLE of its article's cards regardless of anything picked
  // as padding — that's the whole point of a lead image. Padding selection
  // has to know about that guaranteed future usage up front, or an image can
  // look fully available right up until its own article is processed and
  // pushes it well past the cap in one go.
  const ownReserve = new Map(ownImages.map((u) => [u, CARDS_PER_ARTICLE]));
  function effectiveUsage(u) {
    return (usage.get(u) ?? 0) + (ownReserve.get(u) ?? 0);
  }

  // A hard cap on how many cards any one image may appear in, kept well under
  // variety.ts's MAX_IMAGE_SHARE (25%). Based on an upper-bound estimate of the
  // day's final card count (some articles get skipped when their extract can't
  // support another distinct excerpt, which only ever lowers the real count),
  // with a wide safety margin so that overshoot never pushes past 25%.
  const estimatedCards = pages.filter(Boolean).length * CARDS_PER_ARTICLE;
  const usageCap = Math.max(CARDS_PER_ARTICLE + 1, Math.floor(estimatedCards * 0.2));

  // This is a hard ceiling, not a preference: an image at or past usageCap is
  // simply never returned, even if that means returning fewer images than
  // asked for. An earlier version fell back to over-cap candidates when the
  // under-cap pool ran short for a two-image pick — that fallback, not pool
  // size, was what let a single image run well past the cap, because once a
  // few images crossed it together the "least-over" one kept winning that
  // fallback on every subsequent call. A carousel that gets one fewer padding
  // image than requested still satisfies every existing variety rule (it only
  // needs media.length > 1 to count), so degrading gracefully is fine.
  function pickPadding(exclude, count) {
    const available = [...new Set(paddingPool.filter((u) => !exclude.includes(u) && effectiveUsage(u) < usageCap))];
    const byUsage = available.sort((a, b) => effectiveUsage(a) - effectiveUsage(b));
    return byUsage.slice(0, count);
  }

  // An article with no lead photo of its own borrows one from the pool, and
  // from that point on the borrowed image gets reused across that article's
  // own cards just like a real lead would. Assigning (and reserving) every
  // borrow in one pass, before any card is built, matters as much as
  // ownReserve's own up-front computation above: an article processed early
  // in `pages` order must see a later article's eventual borrow reserved too,
  // not just its own real lead images.
  const mediaFor = new Map();
  pages.forEach((p) => {
    if (!p) return;
    if (p.image) {
      mediaFor.set(p, [p.image]);
      return;
    }
    // A card must have at least one image, so this one fallback ignores the
    // cap if every candidate is somehow already at it — EXTRA_IMAGES alone
    // gives four options against a cap of at least four, so in practice this
    // never happens.
    const borrowed = pickPadding([], 1)[0] ?? paddingPool[0];
    mediaFor.set(p, [borrowed]);
    ownReserve.set(borrowed, (ownReserve.get(borrowed) ?? 0) + CARDS_PER_ARTICLE);
  });

  // Running card count for the whole day — NOT the article index. Rotating the
  // register off this keeps adjacent cards alternating (long, carousel, image-led,
  // short carousel) even across an article boundary, instead of resetting to the
  // same mode at the start of every article.
  let i = 0;

  pages.forEach((p) => {
    if (!p) return;
    const media = mediaFor.get(p);
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
        // Excludes media so a repeat can't collide as a React key in Carousel.
        const extras = pickPadding(media, 2);
        excerpt = slices[textSlot++];
        detail = `${p.title} · in parts`;
        connector = "Swipe sideways — one idea, several parts.";
        cardMedia = [...media, ...extras];
      } else if (mode === 2) {
        excerpt = ""; // deliberate — the image-led card. Do not touch.
        detail = p.title;
        connector = "Look before you read.";
      } else {
        const [extra] = pickPadding(media, 1);
        excerpt = slices[textSlot++];
        detail = `${p.title} · two views`;
        connector = "One line, two views, then on.";
        cardMedia = extra ? [...media, extra] : media;
      }

      bump(cardMedia);
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
  const pages = await summaryAll(entry.articles);
  days.push(buildDay(entry, pages));
  process.stdout.write(
    `${entry.day}: ${pages.filter(Boolean).length} articles, ${days[days.length - 1].cards.length} cards\n`,
  );
}

const deck = { topic: "Suits", week: 1, days };
writeFileSync("content/suits.json", JSON.stringify(deck, null, 2) + "\n");
console.log("wrote content/suits.json");
