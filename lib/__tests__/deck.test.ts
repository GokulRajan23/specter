import { describe, it, expect } from "vitest";
import { getDeck, getDay, getDayPreview, getDeckPreviews } from "@/lib/deck";
import type { Day } from "@/lib/content";

describe("deck loading", () => {
  it("loads a deck with a topic and seven days", () => {
    const deck = getDeck();
    expect(deck.topic).toBe("Suits");
    expect(deck.days).toHaveLength(7);
  });

  it("finds a day by name", () => {
    const deck = getDeck();
    const monday = getDay(deck, "monday");
    expect(monday?.day).toBe("monday");
    expect(monday?.cards.length).toBeGreaterThan(0);
  });

  it("returns undefined for a day not in the deck", () => {
    const deck = { topic: "X", week: 1, days: [] };
    expect(getDay(deck, "monday")).toBeUndefined();
  });

  it("gives every card the fields the UI reads", () => {
    const card = getDay(getDeck(), "monday")!.cards[0];
    expect(typeof card.source).toBe("string");
    expect(typeof card.domain).toBe("string");
    expect(typeof card.detail).toBe("string");
    expect(card.url).toMatch(/^https?:\/\//);
    expect(Array.isArray(card.media)).toBe(true);
    expect(typeof card.excerpt).toBe("string");
    expect(typeof card.connector).toBe("string");
  });
});

describe("getDayPreview", () => {
  const textOnly = {
    source: "A",
    domain: "a.test",
    detail: "A · lead",
    url: "https://a.test",
    media: [],
    excerpt: "Text-only first card.",
    connector: "One.",
  };
  const withImage = {
    source: "B",
    domain: "b.test",
    detail: "B · lead",
    url: "https://b.test",
    media: ["b.jpg"],
    excerpt: "Second card, with an image.",
    connector: "Two.",
  };

  it("skips a text-only first card in favour of the day's first card with an image", () => {
    const day: Day = { day: "monday", slot: "Origins", cards: [textOnly, withImage] };
    const preview = getDayPreview(day);
    expect(preview.card?.source).toBe("B");
    expect(preview.card?.image).toBe("b.jpg");
  });

  it("falls back to the first card, text-only, when nothing in the day has an image", () => {
    const day: Day = { day: "monday", slot: "Origins", cards: [textOnly] };
    const preview = getDayPreview(day);
    expect(preview.card?.source).toBe("A");
    expect(preview.card?.image).toBeNull();
  });

  it("returns a null card, not an empty box, when the day has no cards", () => {
    const day: Day = { day: "monday", slot: "Origins", cards: [] };
    expect(getDayPreview(day).card).toBeNull();
  });

  it("carries the day's slot and card count regardless of which card previews", () => {
    const day: Day = { day: "tuesday", slot: "The map", cards: [textOnly, withImage] };
    const preview = getDayPreview(day);
    expect(preview.day).toBe("tuesday");
    expect(preview.slot).toBe("The map");
    expect(preview.cardCount).toBe(2);
  });

  it("truncates a long excerpt on a word boundary", () => {
    const longExcerpt = "word ".repeat(60).trim();
    const day: Day = {
      day: "monday",
      slot: "Origins",
      cards: [{ ...textOnly, excerpt: longExcerpt }],
    };
    const excerpt = getDayPreview(day).card!.excerpt;
    expect(excerpt.length).toBeLessThan(longExcerpt.length);
    expect(excerpt.endsWith("…")).toBe(true);
    expect(longExcerpt.startsWith(excerpt.slice(0, -1))).toBe(true);
  });

  it("leaves a short excerpt untouched", () => {
    const day: Day = { day: "monday", slot: "Origins", cards: [textOnly] };
    expect(getDayPreview(day).card?.excerpt).toBe("Text-only first card.");
  });
});

describe("getDeckPreviews", () => {
  it("returns one preview per day, in deck order", () => {
    const deck = getDeck();
    const previews = getDeckPreviews(deck);
    expect(previews).toHaveLength(7);
    expect(previews.map((p) => p.day)).toEqual(deck.days.map((d) => d.day));
  });
});
