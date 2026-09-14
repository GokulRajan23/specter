import deck from "@/content/suits.json";
import type { Day, DayName, Deck } from "@/lib/content";

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
