import type { Day } from "@/lib/content";

/** An "image-led" card is one with almost no text — the picture carries it. */
const IMAGE_LED_MAX_CHARS = 40;
const MIN_DISTINCT_ARTICLES = 3;
const MIN_CAROUSELS = 2;

/**
 * The spec requires filler with structural variety, because a day built from one
 * article walked top to bottom would be boring for reasons that have nothing to do
 * with the product. Returns a list of violations; empty means the day is acceptable.
 */
export function varietyViolations(day: Day): string[] {
  const out: string[] = [];
  if (day.cards.length === 0) return out;

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

  return out;
}
