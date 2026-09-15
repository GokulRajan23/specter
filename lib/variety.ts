import type { Day } from "@/lib/content";

/** An "image-led" card is one with almost no text — the picture carries it. */
const IMAGE_LED_MAX_CHARS = 40;
const MIN_DISTINCT_ARTICLES = 3;
const MIN_CAROUSELS = 2;
/** IDEA.md calls for roughly 20-30 cards a day — a session, not a twenty-second scroll. */
const MIN_CARDS = 18;
/** No single photo should dominate a day's cards — a repeated filler image reads as
 * exactly the false negative the filler exists to avoid. */
const MAX_IMAGE_SHARE = 0.25;

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

  return out;
}
