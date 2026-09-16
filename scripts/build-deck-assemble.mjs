#!/usr/bin/env node
/**
 * Assemble phase for the "Suits" deck. No network — everything here reads
 * only from scripts/.cache/wikipedia/*.json (populated by
 * `node scripts/build-deck.mjs fetch`).
 *
 * The CARDS table below is the hand-curated week: for every card it names
 * the article, the section to draw from, and the sentence range within that
 * section's text. buildExcerpt() reconstructs the excerpt purely by slicing
 * and joining those sentences — the only prose this file (or its author)
 * contributes anywhere is a card's `connector`.
 *
 * The founding rule is enforced in code, not by care: every excerpt is
 * re-checked against the article's cached extract (whitespace-normalized,
 * since headings and blank lines are legitimately stripped) with
 * String.includes(), and any card that fails is dropped and counted rather
 * than patched by hand.
 */

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { loadArticle, splitSections, verifiedImages, ALL_TITLES } from "./build-deck-lib.mjs";

const OUTPUT_PATH = fileURLToPath(new URL("../content/suits.json", import.meta.url));

// ---------------------------------------------------------------------------
// Sentence splitting
// ---------------------------------------------------------------------------

// Splits on sentence-ending punctuation followed by whitespace + a capital
// letter, digit, or opening quote/paren, while trying not to break on common
// abbreviations. Not perfect (a handful of parenthetical abbreviations like
// "(d. 1795)" still get treated as two "sentences") — but that only affects
// which indices a card spec has to span, never correctness: the verbatim
// check re-joins with a single space and asserts the result is still an
// exact substring of the source, so an imperfect split just needs a wider
// [start, end) range, never a hand-edited excerpt.
const ABBR = /\b(Mr|Mrs|Ms|Dr|St|Sr|Jr|vs|etc|e\.g|i\.e|no|U\.S|U\.K|Co|Inc|Ltd|Ave|approx|c|d)\.$/i;

function splitSentences(text) {
  const norm = text.replace(/\s+/g, " ").trim();
  const out = [];
  let start = 0;
  for (let i = 0; i < norm.length; i++) {
    const ch = norm[i];
    if (ch === "." || ch === "!" || ch === "?") {
      const next = norm[i + 1];
      const after = norm[i + 2];
      const atEnd = i === norm.length - 1;
      if (atEnd || (next === " " && after && /[A-Z0-9"'(]/.test(after))) {
        const candidate = norm.slice(start, i + 1);
        if (atEnd || !ABBR.test(candidate.trim())) {
          out.push(candidate.trim());
          start = i + 2;
        }
      }
    }
  }
  if (start < norm.length) out.push(norm.slice(start).trim());
  return out.filter(Boolean);
}

function normalize(text) {
  return text.replace(/\s+/g, " ").trim();
}

// Found by eye during curation, not by any name pattern: images that pass
// every automated filter (real jpg/png, resolves, not on 3+ unrelated
// pages) but are plainly wrong for the article they're attached to. Wool
// species navboxes and similar cross-linking occasionally puts an unrelated
// photo on exactly two pages — one short of the shared-template threshold —
// which is how a ground-elder plant photo ended up a "usable image" on both
// Fast fashion and Slow fashion. Curation means catching this kind of thing
// by looking, not just by rule.
const MANUALLY_EXCLUDED_IMAGES = new Set([
  "https://commons.wikimedia.org/wiki/Special:FilePath/Aegopodium_podagraria1_ies.jpg?width=760",
]);

function findSection(sections, sectionQuery) {
  if (sectionQuery === "") return sections.find((s) => s.heading === "");
  return sections.find((s) => s.heading.toLowerCase() === sectionQuery.toLowerCase());
}

function wikiUrl(resolvedTitle) {
  return `https://en.wikipedia.org/wiki/${encodeURIComponent(resolvedTitle.replace(/ /g, "_"))}`;
}

/**
 * Resolves one card spec against the cache. Returns either
 * { drop: true, reason } or { drop: false, excerpt, resolvedTitle, heading,
 * url, articlePool }. This is the one place the founding rule is enforced:
 * every non-empty excerpt must appear verbatim (whitespace-normalized) in
 * the article's cached extract.
 */
function buildExcerpt(spec) {
  const data = loadArticle(spec.title);
  if (!data) return { drop: true, reason: `${spec.title}: not in cache — run "fetch" first` };
  if (data.missing) return { drop: true, reason: `${spec.title}: missing/404 on Wikipedia` };

  const sections = splitSections(data.extract);
  const section = findSection(sections, spec.section);
  if (!section) {
    return { drop: true, reason: `${spec.title}: no section matching "${spec.section}"` };
  }

  let excerpt = "";
  if (spec.mode !== "led") {
    const sentences = splitSentences(section.text);
    const [s, e] = spec.range;
    if (s == null || e == null || s < 0 || e > sentences.length || s >= e) {
      return {
        drop: true,
        reason: `${spec.title} :: ${section.heading || "(lead)"}: range [${s},${e}) out of bounds (${sentences.length} sentence(s))`,
      };
    }
    excerpt = sentences.slice(s, e).join(" ").trim();
    const haystack = normalize(data.extract);
    if (!haystack.includes(normalize(excerpt))) {
      return {
        drop: true,
        reason: `${spec.title} :: ${section.heading || "(lead)"}: excerpt is not a verbatim substring of the cached article`,
      };
    }
  }

  return {
    drop: false,
    excerpt,
    resolvedTitle: data.resolvedTitle,
    heading: section.heading,
    url: wikiUrl(data.resolvedTitle),
    articlePool: verifiedImages(data).filter((u) => !MANUALLY_EXCLUDED_IMAGES.has(u)),
  };
}

// ---------------------------------------------------------------------------
// Image allocation
// ---------------------------------------------------------------------------

/**
 * Hands out images for one day. Cycles through each article's own verified
 * pool (so a five-photo article gives up to five distinct cards a distinct
 * photo before repeating), and tries hard not to repeat whatever the
 * previous card just showed — the one adjacency rule the owner explicitly
 * flagged as reading worst.
 */
class DayImagePool {
  constructor() {
    this.cursors = new Map(); // article title -> next index into its pool
  }

  pick(title, pool, count, avoid) {
    if (pool.length === 0) return [];
    const avoidSet = new Set(avoid);
    let cursor = this.cursors.get(title) ?? 0;
    const picked = [];
    const maxAttempts = pool.length * 2 + count + 2;
    for (let attempt = 0; picked.length < count && attempt < maxAttempts; attempt++) {
      const candidate = pool[cursor % pool.length];
      cursor++;
      if (picked.includes(candidate)) continue;
      // Only dodge the "avoid" set (the previous card's images) while there is
      // still a genuinely distinct candidate left to use instead.
      if (avoidSet.has(candidate) && pool.some((u) => !picked.includes(u) && !avoidSet.has(u))) continue;
      picked.push(candidate);
    }
    this.cursors.set(title, cursor);
    return picked;
  }
}

function detailFor(built, mediaCount) {
  const heading = built.heading || "lead";
  const base = `${built.resolvedTitle} · ${heading}`;
  return mediaCount > 1 ? `${base} · in parts` : base;
}

/**
 * Builds one day from its card specs. Returns the assembled Day plus a
 * report of how many cards were dropped and why — the founding rule's "drop
 * and report" requirement, not a best-effort patch.
 */
function buildDay(dayName, slot, specs) {
  const pool = new DayImagePool();
  const cards = [];
  const dropped = [];

  for (const spec of specs) {
    const built = buildExcerpt(spec);
    if (built.drop) {
      dropped.push(built.reason);
      continue;
    }

    const mode = spec.mode ?? (built.articlePool.length === 0 ? "text" : "single");
    const lastImages = cards.length > 0 ? cards[cards.length - 1].media : [];
    let media = [];
    if (mode === "text") {
      media = [];
    } else if (mode === "led") {
      media = pool.pick(built.resolvedTitle, built.articlePool, 1, lastImages);
    } else if (mode === "carousel") {
      media = pool.pick(built.resolvedTitle, built.articlePool, spec.carouselCount ?? 2, lastImages);
    } else {
      media = pool.pick(built.resolvedTitle, built.articlePool, 1, lastImages);
    }

    if (media.length === 0 && built.excerpt.trim() === "") {
      dropped.push(`${spec.title} :: ${built.heading || "(lead)"}: no image and no text — empty card`);
      continue;
    }

    cards.push({
      source: "Wikipedia",
      domain: "en.wikipedia.org",
      detail: detailFor(built, media.length),
      url: built.url,
      media,
      excerpt: built.excerpt,
      connector: spec.connector,
    });
  }

  return { day: { day: dayName, slot, cards }, dropped };
}

// ---------------------------------------------------------------------------
// The seven-slot arc — CARDS table
// ---------------------------------------------------------------------------
// section: "" means the lead. range: [startSentenceIdx, endSentenceIdxExclusive)
// within that section, 0-based. mode: "single" (default), "text" (no image),
// "led" (image only, empty excerpt), "carousel" (2-3 images).

const MONDAY = [
  { title: "Suit", section: "", range: [0, 2], mode: "single",
    connector: "Start with the word the whole week hangs off of." },
  { title: "Suit", section: "Terminology", range: [0, 1], mode: "text",
    connector: "Worth a slower read before moving past it." },
  { title: "Suit", section: "", range: [11, 12], mode: "carousel", carouselCount: 3,
    connector: "One sentence, several branches — three of them get their own day later this week." },
  { title: "Suit", section: "", range: [12, 15], mode: "text",
    connector: "The rest of that branch, followed one step further." },
  { title: "Suit jacket", section: "", range: [0, 1], mode: "text",
    connector: "From the whole to its first named piece." },
  { title: "Suit jacket", section: "Single and double-breasted", range: [0, 4], mode: "single",
    connector: "Same piece, zoomed into the detail that varies most." },
  { title: "Waistcoat", section: "", range: [0, 3], mode: "single",
    connector: "Next piece down the map." },
  { title: "Waistcoat", section: "Names", range: [7, 9], mode: "single",
    connector: "Even the name doesn't get a clean answer." },
  { title: "Waistcoat", section: "17th–18th centuries", range: [0, 4], mode: "carousel", carouselCount: 3,
    connector: "The name's uncertain — the shape changing over time is not." },
  { title: "Trousers", section: "", range: [0, 1], mode: "led",
    connector: "Same map, a piece most people stop noticing." },
  { title: "Trousers", section: "Terminology", range: [4, 7], mode: "single",
    connector: "Don't assume the word means the same thing wherever you're reading this." },
  { title: "Necktie", section: "", range: [0, 1], mode: "single",
    connector: "The first piece on today's map that isn't holding anything up." },
  { title: "Necktie", section: "", range: [8, 10], mode: "single",
    connector: "Someone, at some point, actually sat down and did the math on this one." },
  { title: "Lapel", section: "", range: [0, 1], mode: "single",
    connector: "Back to the jacket for a fold worth a closer look." },
  { title: "Lapel", section: "", range: [3, 7], mode: "carousel", carouselCount: 3,
    connector: "One fold, more than one shape — swipe through them." },
  { title: "Dress shirt", section: "", range: [0, 2], mode: "single",
    connector: "One layer further in." },
  { title: "Dress shirt", section: "Components", range: [0, 3], mode: "text",
    connector: "Taken apart, piece by named piece — read this one slowly." },
  { title: "Cufflink", section: "", range: [0, 2], mode: "single",
    connector: "Today's map ends on its smallest item." },
  { title: "Cufflink", section: "History", range: [0, 3], mode: "single",
    connector: "Small object, longer backstory than its size suggests." },
];

const TUESDAY = [
  { title: "Savile Row", section: "", range: [0, 2], mode: "single",
    connector: "Yesterday was the vocabulary. Today is where the vocabulary was invented." },
  { title: "Savile Row", section: "History", range: [1, 2], mode: "text",
    connector: "Worth pausing on the founding details before the street gets its reputation." },
  { title: "Savile Row", section: "", range: [6, 8], mode: "carousel", carouselCount: 3,
    connector: "A couple of names here will come back on their own on Friday." },
  { title: "Frock coat", section: "", range: [0, 3], mode: "single",
    connector: "From where the tailoring happened to what it was making before the suit existed." },
  { title: "Frock coat", section: "", range: [5, 7], mode: "carousel", carouselCount: 3,
    connector: "Worth seeing across a few examples rather than reading about in the abstract." },
  { title: "Frock coat", section: "", range: [18, 20], mode: "single",
    connector: "Every garment on this map eventually gets replaced by the next one." },
  { title: "Beau Brummell", section: "", range: [0, 1], mode: "single",
    connector: "One person's name is about to come up a lot today." },
  { title: "Beau Brummell", section: "Life", range: [11, 13], mode: "text",
    connector: "Worth reading his own beginning before the legend version takes over." },
  { title: "Beau Brummell", section: "Later life, illness and death", range: [0, 1], mode: "led",
    connector: "Not every origin story on this map ends well." },
  { title: "Dandy", section: "", range: [0, 1], mode: "single",
    connector: "The man from the last two cards gave his approach a name." },
  { title: "Dandy", section: "British dandyism", range: [1, 3], mode: "single",
    connector: "Same figure, one level more specific." },
  { title: "Dandy", section: "British dandyism", range: [15, 18], mode: "text",
    connector: "A longer one here — this description holds up better read in full." },
  { title: "Morning dress", section: "", range: [0, 1], mode: "single",
    connector: "A second formal register runs alongside the one Brummell's name attaches to." },
  { title: "Morning dress", section: "History", range: [0, 2], mode: "single",
    connector: "Its name is a clue worth sitting with for a second." },
  { title: "Black tie", section: "", range: [0, 1], mode: "single",
    connector: "A third register, for evenings, with its own separate origin." },
  { title: "Black tie", section: "British origins in the 19th century", range: [2, 3], mode: "single",
    connector: "One name here connects straight back to Friday's first house." },
  { title: "Black tie", section: "British origins in the 19th century", range: [8, 10], mode: "text",
    connector: "One line, but it repositions everything that came before it today." },
  { title: "Court dress", section: "", range: [0, 2], mode: "single",
    connector: "A fourth register today, and the only one still written into law." },
  { title: "Court dress", section: "Reform", range: [6, 9], mode: "single",
    connector: "Even the oldest register on this map isn't frozen in place." },
];

const WEDNESDAY = [
  { title: "Bespoke tailoring", section: "", range: [0, 2], mode: "single",
    connector: "From where the tailoring happened to how the tailoring is actually done." },
  { title: "Tailor", section: "", range: [0, 2], mode: "single",
    connector: "Start with the person, before the process." },
  { title: "Pattern (sewing)", section: "", range: [0, 3], mode: "single",
    connector: "The first thing that person makes isn't the garment yet." },
  { title: "Wool", section: "", range: [0, 1], mode: "single",
    connector: "Before the pattern gets cut, there's the material it's cut from." },
  { title: "Wool", section: "Crimp", range: [0, 4], mode: "single",
    connector: "One property of that material is worth slowing down for." },
  { title: "Wool", section: "Shearing", range: [0, 3], mode: "text",
    connector: "A longer read here, on the step before any of this reaches a mill." },
  { title: "Worsted", section: "", range: [0, 1], mode: "led",
    connector: "Same fibre, a different name for a different result." },
  { title: "Worsted", section: "", range: [3, 6], mode: "single",
    connector: "Worth reading closely — the two terms get confused for a reason." },
  { title: "Tweed", section: "", range: [0, 2], mode: "single",
    connector: "A cousin fabric that took a different route entirely." },
  { title: "Tweed", section: "", range: [3, 5], mode: "carousel", carouselCount: 2,
    connector: "Two images here rather than one, since the pattern is half the point." },
  { title: "Sewing", section: "", range: [0, 3], mode: "text",
    connector: "Everything above this line eventually has to meet at a needle." },
  { title: "Textile", section: "", range: [0, 2], mode: "single",
    connector: "One level further out, to the category all of today's materials sit inside." },
  { title: "Textile", section: "Fibre sources", range: [0, 3], mode: "carousel", carouselCount: 3,
    connector: "Worth seeing side by side rather than described one at a time." },
  { title: "Suit", section: "Fabric", range: [0, 4], mode: "single",
    connector: "Back to Monday's garment, read again with today's vocabulary in hand." },
  { title: "Suit", section: "Fabric", range: [32, 35], mode: "single",
    connector: "One more layer of the same jacket, one you'd never notice unfolded." },
];

const THURSDAY = [
  { title: "Bespoke tailoring", section: "Meaning of the term", range: [0, 1], mode: "single",
    connector: "Wednesday was mechanics. Today is what the words are allowed to mean — which turns out to be contested." },
  { title: "Bespoke tailoring", section: "Compared to made-to-measure", range: [0, 2], mode: "text",
    connector: "This is where the argument actually starts." },
  { title: "Bespoke tailoring", section: "Compared to made-to-measure", range: [5, 7], mode: "text",
    connector: "Worth reading in full — this is the part the argument keeps coming back to." },
  { title: "Bespoke tailoring", section: "Advertising Standards Authority ruling", range: [0, 1], mode: "single",
    connector: "It stopped being an opinion and became a ruling." },
  { title: "Bespoke tailoring", section: "Advertising Standards Authority ruling", range: [2, 3], mode: "text",
    connector: "The ruling's own wording, in full — it's worth reading slowly rather than summarized." },
  { title: "Made-to-measure", section: "", range: [0, 1], mode: "single",
    connector: "Same ruling, now from the other term's own article." },
  { title: "Made-to-measure", section: "Advertising Standards Authority ruling", range: [3, 4], mode: "text",
    connector: "Here's that ruling quoted directly, rather than characterized secondhand." },
  { title: "Made-to-measure", section: "Advertising Standards Authority ruling", range: [4, 5], mode: "single",
    connector: "Not everyone quoted here agrees the ruling settled anything." },
  { title: "Ready-to-wear", section: "", range: [0, 2], mode: "single",
    connector: "One more rung down the same ladder bespoke and made-to-measure sit on." },
  { title: "Ready-to-wear", section: "", range: [5, 7], mode: "text",
    connector: "Worth sitting with — this is the same logic that opens tomorrow's fast-fashion argument." },
  { title: "Brooks Brothers", section: "", range: [0, 1], mode: "single",
    connector: "One house that has occupied a rung of that ladder for two centuries running." },
  { title: "Brooks Brothers", section: "Founding and 19th century", range: [6, 9], mode: "carousel", carouselCount: 3,
    connector: "One customer of that house's early ready-to-wear era is worth seeing in more than one frame." },
  { title: "Fast fashion", section: "", range: [0, 2], mode: "carousel", carouselCount: 2,
    connector: "Take that same ladder to its fastest, cheapest rung." },
  { title: "Fast fashion", section: "", range: [4, 5], mode: "led",
    connector: "The image carries this one — the caption underneath is the whole argument." },
  { title: "Slow fashion", section: "", range: [0, 2], mode: "single",
    connector: "The deliberate reaction sitting at the opposite end of today's ladder." },
  { title: "Slow fashion", section: "", range: [3, 6], mode: "text",
    connector: "A longer closing read for the day — worth finishing before moving to Friday's houses." },
];

const FRIDAY = [
  { title: "Henry Poole & Co", section: "", range: [0, 2], mode: "single",
    connector: "Enough vocabulary and argument — today is primary sources, starting with the house most of it traces back to." },
  { title: "Henry Poole & Co", section: "History", range: [0, 3], mode: "carousel", carouselCount: 3,
    connector: "Worth seeing this house across more than one photo before its most famous story." },
  { title: "Henry Poole & Co", section: "Origins of the tuxedo", range: [0, 1], mode: "single",
    connector: "This is the same house Tuesday's black-tie card pointed back to." },
  { title: "Henry Poole & Co", section: "Origins of the tuxedo", range: [3, 5], mode: "text",
    connector: "Worth reading the whole exchange, not just the outcome." },
  { title: "Gieves & Hawkes", section: "", range: [0, 2], mode: "single",
    connector: "Next door on the same street, with a different founding clientele." },
  { title: "Gieves & Hawkes", section: "History", range: [4, 7], mode: "carousel", carouselCount: 3,
    connector: "This house's own history is dense enough to need three images to sit with." },
  { title: "Anderson & Sheppard", section: "", range: [0, 2], mode: "led",
    connector: "This house's entire cached article is short enough for exactly one card." },
  { title: "H. Huntsman & Sons", section: "", range: [4, 6], mode: "single",
    connector: "Founded the same year as one of today's earlier houses, a few doors along." },
  { title: "H. Huntsman & Sons", section: "Bespoke process", range: [2, 5], mode: "text",
    connector: "Worth reading start to finish — this is the process the whole week has been circling." },
  { title: "Dege & Skinner", section: "", range: [0, 4], mode: "single",
    connector: "Another address on the same short street." },
  { title: "Norton & Sons", section: "", range: [0, 3], mode: "text",
    connector: "Not every house on this street has an unbroken run." },
  { title: "Ede & Ravenscroft", section: "", range: [0, 3], mode: "single",
    connector: "Step off the street entirely for the oldest name on today's list." },
  { title: "Ede & Ravenscroft", section: "", range: [3, 6], mode: "text",
    connector: "Its clientele reads nothing like the rest of today's list." },
  { title: "Kiton", section: "", range: [0, 5], mode: "single",
    connector: "Leave the street, and the country, for today's one non-British house." },
  { title: "Brioni (brand)", section: "", range: [0, 3], mode: "single",
    connector: "One more house from the same country, with a very different founding move." },
  { title: "Brioni (brand)", section: "", range: [2, 3], mode: "led",
    connector: "Today's map of houses ends on the image rather than the reading." },
];

const SATURDAY = [
  { title: "Business casual", section: "", range: [0, 3], mode: "single",
    connector: "Last stop this week: the frontier where Monday's rules start loosening." },
  { title: "Business casual", section: "", range: [6, 8], mode: "text",
    connector: "This one has a named predecessor — worth reading before jumping to it." },
  { title: "Casual Friday", section: "", range: [0, 2], mode: "text",
    connector: "That predecessor, from its own article." },
  { title: "Casual Friday", section: "", range: [3, 4], mode: "led",
    connector: "The image is doing the work on this one." },
  { title: "Athleisure", section: "", range: [0, 3], mode: "single",
    connector: "Keep loosening the same rules and this is where they end up." },
  { title: "Athleisure", section: "Background", range: [0, 3], mode: "text",
    connector: "Worth reading in full before moving to a completely different lineage." },
  { title: "Streetwear", section: "", range: [0, 3], mode: "single",
    connector: "A separate line entirely arrives at a similar place." },
  { title: "Streetwear", section: "African American culture", range: [3, 6], mode: "carousel", carouselCount: 3,
    connector: "One figure here is worth seeing in more than one frame." },
  { title: "Streetwear", section: "", range: [5, 6], mode: "text",
    connector: "And this line loops back toward Friday's houses by the end." },
  { title: "Normcore", section: "", range: [0, 2], mode: "text",
    connector: "One more stop before the last dress code of the week." },
  { title: "Normcore", section: "Fashion", range: [0, 3], mode: "text",
    connector: "Worth reading closely — this is the part that actually defines the look." },
  { title: "Smart casual", section: "", range: [0, 3], mode: "single",
    connector: "Which sits exactly between Monday's first card and today's." },
  { title: "Smart casual", section: "Apparel", range: [0, 2], mode: "carousel", carouselCount: 2,
    connector: "One name here has come up before, on a completely different day." },
  { title: "Smart casual", section: "", range: [5, 6], mode: "text",
    connector: "A fitting note to close the week's main run on." },
];

const DAY_PLANS = [
  { day: "monday", slot: "The map", specs: MONDAY },
  { day: "tuesday", slot: "Origins", specs: TUESDAY },
  { day: "wednesday", slot: "Mechanics", specs: WEDNESDAY },
  { day: "thursday", slot: "The arguments", specs: THURSDAY },
  { day: "friday", slot: "Primary sources", specs: FRIDAY },
  { day: "saturday", slot: "The frontier", specs: SATURDAY },
];

// ---------------------------------------------------------------------------
// Sunday — recall. Reuses Mon-Sat cards verbatim (same excerpt, media, url,
// detail) with only the connector rewritten as a dinner-table question the
// excerpt answers. No new fetching, no new cards, nothing re-derived.
// ---------------------------------------------------------------------------

function buildSunday(weekDays) {
  // [dayIndex, cardIndex, question] — a spread across the week, favouring
  // cards that stand alone well as an answer to a spoken question.
  const picks = [
    [0, 0, "Someone asks what a suit even is, technically. What do you say?"],
    [0, 10, "Someone asks why a necktie knot looks the way it does. What do you say?"],
    [1, 0, "Someone asks who decided suits should look like this. What do you say?"],
    [1, 5, "Someone asks who \"the dandy\" everyone name-drops actually was. What do you say?"],
    [2, 4, "Someone asks why a wool suit can still breathe. What do you say?"],
    [2, 8, "Someone asks what tweed is actually for. What do you say?"],
    [3, 3, "Someone asks why bespoke costs so much. What do you say?"],
    [3, 5, "Someone asks what made-to-measure even means, then. What do you say?"],
    [3, 11, "Someone asks why fast fashion is so cheap. What do you say?"],
    [4, 0, "Someone asks why Savile Row of all streets. What do you say?"],
    [4, 1, "Someone asks where the word \"tuxedo\" came from. What do you say?"],
    [4, 6, "Someone asks what one of these tailoring houses actually looks like. Here's one."],
    [4, 8, "Someone asks if any tailor on that list isn't British. What do you say?"],
    [5, 4, "Someone asks when suits stopped being mandatory at work. What do you say?"],
    [5, 8, "Someone asks what \"normcore\" is supposed to mean. What do you say?"],
  ];

  const cards = picks.map(([dayIdx, cardIdx, question]) => {
    const source = weekDays[dayIdx].cards[cardIdx];
    return { ...source, connector: question };
  });

  return { day: "sunday", slot: "Recall", cards };
}

// ---------------------------------------------------------------------------
// Reading-time estimate (mirrors lib/variety.ts — duplicated here only
// because that module is TypeScript and this is a plain Node script; see the
// comment there for why the constants are what they are).
// ---------------------------------------------------------------------------

const READING_WORDS_PER_MINUTE = 220;
const IMAGE_SECONDS = 4;

function estimateMinutes(day) {
  const totalSeconds = day.cards.reduce((sum, c) => {
    const words = c.excerpt.trim() ? c.excerpt.trim().split(/\s+/).length : 0;
    const textSeconds = (words / READING_WORDS_PER_MINUTE) * 60;
    const imageSeconds = c.media.length > 0 ? IMAGE_SECONDS : 0;
    return sum + textSeconds + imageSeconds;
  }, 0);
  return totalSeconds / 60;
}

export async function assemble() {
  const weekDays = [];
  let totalDropped = 0;

  for (const plan of DAY_PLANS) {
    const { day, dropped } = buildDay(plan.day, plan.slot, plan.specs);
    weekDays.push(day);
    totalDropped += dropped.length;
    const minutes = estimateMinutes(day);
    const images = new Set(day.cards.flatMap((c) => c.media));
    const articles = new Set(day.cards.map((c) => c.url));
    const carousels = day.cards.filter((c) => c.media.length > 1).length;
    const textOnly = day.cards.filter((c) => c.media.length === 0).length;
    process.stdout.write(
      `${day.day}: ${day.cards.length} card(s), ~${minutes.toFixed(1)} min, ` +
        `${articles.size} article(s), ${images.size} image(s), ${carousels} carousel(s), ` +
        `${textOnly} text-only, ${dropped.length} dropped\n`,
    );
    for (const reason of dropped) process.stdout.write(`  dropped: ${reason}\n`);
  }

  const sunday = buildSunday(weekDays);
  weekDays.push(sunday);
  {
    const minutes = estimateMinutes(sunday);
    const images = new Set(sunday.cards.flatMap((c) => c.media));
    const articles = new Set(sunday.cards.map((c) => c.url));
    const carousels = sunday.cards.filter((c) => c.media.length > 1).length;
    const textOnly = sunday.cards.filter((c) => c.media.length === 0).length;
    process.stdout.write(
      `sunday: ${sunday.cards.length} card(s), ~${minutes.toFixed(1)} min, ` +
        `${articles.size} article(s), ${images.size} image(s), ${carousels} carousel(s), ${textOnly} text-only\n`,
    );
  }

  const deck = { topic: "Suits", week: 1, days: weekDays };
  writeFileSync(OUTPUT_PATH, JSON.stringify(deck, null, 2) + "\n");
  process.stdout.write(`\nwrote ${OUTPUT_PATH}\n`);
  process.stdout.write(`total cards dropped for failing verbatim/structural checks: ${totalDropped}\n`);

  const unused = ALL_TITLES.filter(
    (t) => !weekDays.some((d) => d.cards.some((c) => c.url === wikiUrl(loadArticle(t)?.resolvedTitle ?? t))),
  );
  if (unused.length > 0) {
    process.stdout.write(`titles in ALL_TITLES with no surviving card: ${unused.join(", ")}\n`);
  }
}
