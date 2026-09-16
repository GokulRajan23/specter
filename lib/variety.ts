import type { Card, Day } from "@/lib/content";

/** An "image-led" card is one with almost no text — the picture carries it. */
const IMAGE_LED_MAX_CHARS = 40;
const MIN_DISTINCT_ARTICLES = 3;
const MIN_CAROUSELS = 2;
/** No single photo should dominate a day's cards — a repeated filler image reads as
 * exactly the false negative the filler exists to avoid. */
const MAX_IMAGE_SHARE = 0.25;

/**
 * Cards got longer (real excerpts, cut on sentence boundaries, some running
 * a full paragraph) once curated content replaced the filler, which made a
 * raw card count meaningless: 18 one-sentence cards and 18 paragraph cards
 * are very different sessions. A reading-time estimate is the thing that
 * actually matters — roughly 6-7 minutes of a real session, the same target
 * IDEA.md described, just measured directly instead of by proxy.
 *
 * Average adult silent reading speed; used only to turn a word count into a
 * rough duration, not to model any particular reader.
 */
const READING_WORDS_PER_MINUTE = 220;
/** A card's image gets glanced at, not read — a small flat addition per
 * card (once, regardless of how many photos are in its carousel) rather
 * than a per-photo cost. */
const IMAGE_SECONDS = 4;
/** The curation target is "roughly 6-7 minutes" a day (see the build script
 * and the deck report for what each day actually came out at — richer
 * articles land near the top of that range, thinner ones a bit under it).
 * This constant is deliberately not that number: it is the floor a day
 * must clear to not be flagged, set low enough that genuine day-to-day
 * variation in how much a topic's source material supports doesn't trip
 * it, while still catching the degenerate case the old MIN_CARDS proxy
 * was actually guarding against — a day that is just plain thin. */
const MIN_READING_MINUTES = 3.5;
/** However long the excerpts run, a day should never collapse to a handful
 * of enormous cards just because their word count alone clears the reading-
 * time target — this is the low floor on count the reading-time rule needs
 * to keep from being gamed that way. */
const MIN_CARDS = 10;

function wordCount(text: string): number {
  const trimmed = text.trim();
  return trimmed === "" ? 0 : trimmed.split(/\s+/).length;
}

/** Seconds to read one card: its excerpt at READING_WORDS_PER_MINUTE, plus a
 * flat IMAGE_SECONDS if it carries any image at all. */
export function estimatedCardSeconds(card: Card): number {
  const textSeconds = (wordCount(card.excerpt) / READING_WORDS_PER_MINUTE) * 60;
  const imageSeconds = card.media.length > 0 ? IMAGE_SECONDS : 0;
  return textSeconds + imageSeconds;
}

/** Estimated minutes to read an entire day, the basis for the reading-time
 * variety rule and useful on its own for reporting. */
export function estimatedReadingMinutes(day: Day): number {
  const totalSeconds = day.cards.reduce((sum, c) => sum + estimatedCardSeconds(c), 0);
  return totalSeconds / 60;
}

/**
 * The spec requires filler with structural variety, because a day built from one
 * article walked top to bottom would be boring for reasons that have nothing to do
 * with the product. Returns a list of violations; empty means the day is acceptable.
 */
export function varietyViolations(day: Day): string[] {
  const out: string[] = [];
  if (day.cards.length === 0) return out;

  if (day.cards.length < MIN_CARDS) {
    out.push(`has ${day.cards.length} card(s); needs at least ${MIN_CARDS}`);
  }

  const minutes = estimatedReadingMinutes(day);
  if (minutes < MIN_READING_MINUTES) {
    out.push(
      `estimated reading time is ${minutes.toFixed(1)} minute(s); needs at least ${MIN_READING_MINUTES}`,
    );
  }

  const articles = new Set(day.cards.map((c) => c.url));
  if (articles.size < MIN_DISTINCT_ARTICLES) {
    out.push(
      `drawn from ${articles.size} article(s); needs at least ${MIN_DISTINCT_ARTICLES}`,
    );
  }

  const carousels = day.cards.filter((c) => c.media.length > 1).length;
  if (carousels < MIN_CAROUSELS) {
    out.push(`has ${carousels} carousel(s); needs at least ${MIN_CAROUSELS}`);
  }

  const imageLed = day.cards.filter((c) => c.excerpt.trim().length <= IMAGE_LED_MAX_CHARS);
  if (imageLed.length === 0) {
    out.push("has no image-led card (an excerpt of 40 characters or fewer)");
  }

  const lengths = day.cards.map((c) => c.excerpt.length);
  const spread = Math.max(...lengths) - Math.min(...lengths);
  if (spread < 80) {
    out.push(`excerpt length spread is ${spread} characters; needs more variation`);
  }

  // Count each image once per card (not once per carousel slot) — a card is what
  // the reader perceives as "the same photo again", not a raw media-array entry.
  const imageCardCounts = new Map<string, number>();
  for (const c of day.cards) {
    for (const url of new Set(c.media)) {
      imageCardCounts.set(url, (imageCardCounts.get(url) ?? 0) + 1);
    }
  }
  for (const [url, count] of imageCardCounts) {
    const share = count / day.cards.length;
    if (share > MAX_IMAGE_SHARE) {
      out.push(
        `image ${url} appears in ${count} of ${day.cards.length} cards (${Math.round(share * 100)}%); must not exceed ${Math.round(MAX_IMAGE_SHARE * 100)}%`,
      );
    }
  }

  // A card whose copy promises several images ("two views", "in parts") must
  // actually carry more than one — otherwise it's an instruction the reader
  // can't follow (swipe for more) on a card that has nothing more to swipe to.
  for (let idx = 0; idx < day.cards.length; idx++) {
    const c = day.cards[idx];
    if (/two views|in parts/.test(c.detail) && c.media.length <= 1) {
      out.push(
        `card ${idx} ("${c.detail}") promises multiple images but has media.length ${c.media.length}`,
      );
    }
  }

  // Image-led cards are good and expected — MIN_CAROUSELS even requires some texture
  // like them. What's bad is two of them (or any two near-empty cards) sitting back
  // to back: the reader sees a wall of pictures, even though the mode rotation that
  // produced them was "technically" alternating.
  for (let idx = 0; idx < day.cards.length - 1; idx++) {
    const here = day.cards[idx].excerpt.trim().length <= IMAGE_LED_MAX_CHARS;
    const next = day.cards[idx + 1].excerpt.trim().length <= IMAGE_LED_MAX_CHARS;
    if (here && next) {
      out.push(
        `cards ${idx} and ${idx + 1} are consecutive near-empty excerpts (40 characters or fewer); they must not sit back to back`,
      );
      break;
    }
  }

  // The same photo on two cards in a row reads worst of all the repeats this
  // module guards against: unlike the 25%-of-a-day share cap, a reader hits
  // this one immediately, with nothing in between to make it feel like a new
  // card. A photo may recur later in the day once the pool runs out, but never
  // right next to itself.
  for (let idx = 0; idx < day.cards.length - 1; idx++) {
    const here = day.cards[idx].media;
    const next = new Set(day.cards[idx + 1].media);
    const repeated = here.find((url) => next.has(url));
    if (repeated) {
      out.push(
        `cards ${idx} and ${idx + 1} both use image ${repeated}; the same image must not appear on adjacent cards`,
      );
    }
  }

  return out;
}
