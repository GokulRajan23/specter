import { describe, it, expect } from "vitest";
import {
  DAY_NAMES,
  DAY_LABELS,
  dayIndex,
  isDayName,
  getDeck,
  getDay,
} from "@/lib/content";

describe("day names", () => {
  it("has seven days starting Monday", () => {
    expect(DAY_NAMES).toHaveLength(7);
    expect(DAY_NAMES[0]).toBe("monday");
    expect(DAY_NAMES[6]).toBe("sunday");
  });

  it("indexes days from zero", () => {
    expect(dayIndex("monday")).toBe(0);
    expect(dayIndex("thursday")).toBe(3);
    expect(dayIndex("sunday")).toBe(6);
  });

  it("labels days in three letters", () => {
    expect(DAY_LABELS.monday).toBe("Mon");
    expect(DAY_LABELS.sunday).toBe("Sun");
  });

  it("narrows arbitrary strings", () => {
    expect(isDayName("monday")).toBe(true);
    expect(isDayName("funday")).toBe(false);
    expect(isDayName("Monday")).toBe(false);
  });
});

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
