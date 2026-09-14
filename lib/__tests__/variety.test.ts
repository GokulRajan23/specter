import { describe, it, expect } from "vitest";
import { varietyViolations } from "@/lib/variety";
import { type Card, type Day } from "@/lib/content";
import { getDeck, getDay } from "@/lib/deck";

function card(over: Partial<Card> = {}): Card {
  return {
    source: "Wikipedia",
    domain: "en.wikipedia.org",
    detail: "Something",
    url: "https://en.wikipedia.org/wiki/Suit_(clothing)",
    media: ["a.jpg"],
    excerpt: "One sentence here. And a second one to make it longer than short.",
    connector: "Because.",
    ...over,
  };
}

function day(cards: Card[]): Day {
  return { day: "monday", slot: "The map", cards };
}

describe("varietyViolations", () => {
  it("flags a day drawn from a single article", () => {
    const cards = Array.from({ length: 8 }, () => card({ url: "https://x.test/one" }));
    expect(varietyViolations(day(cards)).join(" ")).toMatch(/article/i);
  });

  it("flags a day with no carousels", () => {
    const cards = Array.from({ length: 8 }, (_, i) => card({ url: `https://x.test/${i}` }));
    expect(varietyViolations(day(cards)).join(" ")).toMatch(/carousel/i);
  });

  it("flags a day with no image-led card", () => {
    const cards = Array.from({ length: 8 }, (_, i) =>
      card({ url: `https://x.test/${i}`, media: i < 2 ? ["a.jpg", "b.jpg"] : ["a.jpg"] }),
    );
    expect(varietyViolations(day(cards)).join(" ")).toMatch(/image-led/i);
  });

  it("flags a day whose excerpts are all the same length", () => {
    const cards = Array.from({ length: 8 }, (_, i) =>
      card({
        url: `https://x.test/${i}`,
        media: i < 2 ? ["a.jpg", "b.jpg"] : ["a.jpg"],
        excerpt: i === 7 ? "Short." : "Exactly the same length of excerpt, every single time here.",
      }),
    );
    expect(varietyViolations(day(cards)).join(" ")).toMatch(/length/i);
  });

  it("passes a day that satisfies every rule", () => {
    // Repeated to 18 cards (not just the original 6) so this also clears MIN_CARDS —
    // a day needs enough length to be a session, not just enough shape to pass the rest.
    const base: Array<Partial<Card>> = [
      { excerpt: "Short one." },
      { media: ["a.jpg", "b.jpg", "c.jpg"] },
      {
        excerpt:
          "A considerably longer excerpt that runs on for several clauses and sentences. " +
          "It keeps going, because some cards are meant to be dense. And then it stops.",
      },
      { excerpt: "" },
      { media: ["d.jpg", "e.jpg"] },
      { excerpt: "Another middling excerpt, two sentences long. Like so." },
    ];
    const cards: Card[] = Array.from({ length: 18 }, (_, i) =>
      card({ url: `https://x.test/${i}`, ...base[i % base.length] }),
    );
    expect(varietyViolations(day(cards))).toEqual([]);
  });

  it("flags a day with too few cards", () => {
    const cards = Array.from({ length: 8 }, (_, i) =>
      card({
        url: `https://x.test/${i}`,
        media: i < 2 ? ["a.jpg", "b.jpg"] : ["a.jpg"],
        excerpt: i === 7 ? "" : "A middling excerpt with enough clauses to spread the lengths out.",
      }),
    );
    expect(varietyViolations(day(cards)).join(" ")).toMatch(/card/i);
  });

  it("flags two adjacent near-empty cards, even when every other rule passes", () => {
    // This day is a real control: 18 cards, 18 distinct articles, 2 carousels, an
    // image-led card, and a wide excerpt spread — every existing rule is satisfied.
    // The only defect is that its first two cards are both near-empty (<= 40 chars)
    // and sit right next to each other, which is exactly the "wall of pictures"
    // this rule exists to catch.
    const cards: Card[] = Array.from({ length: 18 }, (_, i) => {
      if (i === 0) return card({ url: "https://x.test/0", media: ["a.jpg", "b.jpg", "c.jpg"], excerpt: "" });
      if (i === 1) return card({ url: "https://x.test/1", media: ["d.jpg", "e.jpg"], excerpt: "" });
      if (i === 2) {
        return card({
          url: "https://x.test/2",
          excerpt:
            "A considerably longer excerpt that runs on for several clauses and sentences. " +
            "It keeps going, because some cards are meant to be dense. And then it stops.",
        });
      }
      return card({ url: `https://x.test/${i}`, excerpt: `A middling excerpt, number ${i}, long enough to spread lengths out.` });
    });
    expect(varietyViolations(day(cards)).join(" ")).toMatch(/consecutive/i);
  });

  it("accepts an empty day, which is not filler yet", () => {
    expect(varietyViolations(day([]))).toEqual([]);
  });

  it("holds for the committed Monday deck", () => {
    const monday = getDay(getDeck(), "monday")!;
    expect(varietyViolations(monday)).toEqual([]);
  });
});
