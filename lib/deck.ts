import deck from "@/content/suits.json";
import type { Day, DayName, DayPreview, Deck } from "@/lib/content";

// The committed deck is ~99 KB of JSON. This module is the only place that
// imports it — only server components should import from here, so the deck
// never ends up in a client bundle. Client components that only need day
// names, labels, or types should import from "@/lib/content" instead.

export function getDeck(): Deck {
  return deck as Deck;
}

export function getDay(deck: Deck, day: DayName): Day | undefined {
  return deck.days.find((d) => d.day === day);
}

const EXCERPT_PREVIEW_LIMIT = 160;

function truncateExcerpt(excerpt: string): string {
  if (excerpt.length <= EXCERPT_PREVIEW_LIMIT) return excerpt;
  const cut = excerpt.slice(0, EXCERPT_PREVIEW_LIMIT);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

/** The Today screen previews a day's first card with an image, not
 * necessarily its first card — a day can open on a text-only card. Falls
 * back to the day's first card (still text-only) when nothing in the day
 * has an image, and to `null` only if the day has no cards at all. */
export function getDayPreview(day: Day): DayPreview {
  const card = day.cards.find((c) => c.media.length > 0) ?? day.cards[0];

  return {
    day: day.day,
    slot: day.slot,
    cardCount: day.cards.length,
    card: card
      ? {
          source: card.source,
          domain: card.domain,
          detail: card.detail,
          image: card.media[0] ?? null,
          excerpt: truncateExcerpt(card.excerpt),
        }
      : null,
  };
}

export function getDeckPreviews(deck: Deck): DayPreview[] {
  return deck.days.map(getDayPreview);
}
