#!/usr/bin/env node
/**
 * Throwaway filler generator. Pulls real text and images from Wikipedia so the
 * viewer can be judged against realistic content.
 *
 * This is NOT the content pipeline. It curates nothing, verifies nothing, and
 * calls no model. It exists only so the week of use means something.
 *
 * Usage: npm run filler
 */

import { writeFileSync } from "node:fs";

const API = "https://en.wikipedia.org/api/rest_v1/page/summary/";
const FILE = (name) =>
  `https://commons.wikimedia.org/wiki/Special:FilePath/${name}?width=760`;

// Seven days, each drawn from several articles so no day is one article walked down.
const PLAN = [
  { day: "monday", slot: "The map", articles: ["Suit_(clothing)", "Suit_jacket", "Waistcoat", "Necktie"] },
  { day: "tuesday", slot: "Origins", articles: ["Savile_Row", "Frock_coat", "Beau_Brummell", "Dandy"] },
  { day: "wednesday", slot: "Mechanics", articles: ["Bespoke_tailoring", "Wool", "Tailor", "Pattern_(sewing)"] },
  // Titles verified against the API on 2026-09-13. "Menswear" and "Huntsman_(clothing)"
  // were replaced: the first redirects to Fashion (duplicating this day's third article),
  // the second 404s. Re-verify with the API before adding a title, not after.
  { day: "thursday", slot: "The arguments", articles: ["Made_to_measure", "Off-the-peg", "Fashion", "Slim-fit_pants"] },
  { day: "friday", slot: "Primary sources", articles: ["Henry_Poole_%26_Co", "Gieves_%26_Hawkes", "Anderson_%26_Sheppard", "H._Huntsman_%26_Sons"] },
  { day: "saturday", slot: "The frontier", articles: ["Business_casual", "Smart_casual", "Workwear", "Casual_Friday"] },
  { day: "sunday", slot: "Recall", articles: ["Suit_(clothing)", "Savile_Row", "Bespoke_tailoring", "Necktie"] },
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

/** Cut an extract to n sentences so lengths vary card to card. */
function sentences(text, n) {
  const parts = text.match(/[^.!?]+[.!?]+/g) ?? [text];
  return parts.slice(0, n).join(" ").trim();
}

const EXTRA_IMAGES = [
  FILE("Waistcoat.jpg"),
  FILE("Memphis_tie_1A.JPG"),
  FILE("TailoringFirstFitFront01.jpg"),
  FILE("Savile_Row_from_Burlington_Gardens.jpg"),
];

function buildDay({ day, slot, articles }, pages) {
  const cards = [];

  pages.forEach((p, i) => {
    if (!p) return;
    const media = p.image ? [p.image] : [EXTRA_IMAGES[i % EXTRA_IMAGES.length]];

    // Rotate register so adjacent cards differ: long, carousel, image-led, short carousel.
    // Two of the four modes are carousels so a day of 4 articles clears MIN_CAROUSELS = 2.
    const mode = i % 4;

    if (mode === 0) {
      cards.push({
        source: "Wikipedia",
        domain: "en.wikipedia.org",
        detail: `${p.title} · lead`,
        url: p.url,
        media,
        excerpt: sentences(p.extract, 4),
        connector: `Where ${slot.toLowerCase()} starts.`,
      });
    } else if (mode === 1) {
      // Filtered, not sliced: when p.image is null the fallback above already came
      // from EXTRA_IMAGES, and a repeat would collide as a React key in Carousel.
      // Gieves & Hawkes has no lead image and lands here, so this fires in practice.
      const extras = EXTRA_IMAGES.filter((u) => !media.includes(u)).slice(0, 2);
      cards.push({
        source: "Wikipedia",
        domain: "en.wikipedia.org",
        detail: `${p.title} · in parts`,
        url: p.url,
        media: [...media, ...extras],
        excerpt: sentences(p.extract, 2),
        connector: "Swipe sideways — one idea, several parts.",
      });
    } else if (mode === 2) {
      cards.push({
        source: "Wikipedia",
        domain: "en.wikipedia.org",
        detail: p.title,
        url: p.url,
        media,
        excerpt: "",
        connector: "Look before you read.",
      });
    } else {
      // (i + 2) % 4 never equals i % 4, so this extra image cannot duplicate the
      // fallback image chosen above. Duplicate URLs would collide as React keys.
      cards.push({
        source: "Wikipedia",
        domain: "en.wikipedia.org",
        detail: `${p.title} · two views`,
        url: p.url,
        media: [...media, EXTRA_IMAGES[(i + 2) % EXTRA_IMAGES.length]],
        excerpt: sentences(p.extract, 1),
        connector: "One line, two views, then on.",
      });
    }
  });

  return { day, slot, cards };
}

const days = [];
for (const entry of PLAN) {
  const pages = await Promise.all(entry.articles.map(summary));
  days.push(buildDay(entry, pages));
  process.stdout.write(`${entry.day}: ${pages.filter(Boolean).length} articles\n`);
}

const deck = { topic: "Suits", week: 1, days };
writeFileSync("content/suits.json", JSON.stringify(deck, null, 2) + "\n");
console.log("wrote content/suits.json");
