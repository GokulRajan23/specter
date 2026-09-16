import { describe, it, expect } from "vitest";
import { varietyViolations } from "@/lib/variety";
import { type Card, type Day, DAY_NAMES } from "@/lib/content";
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
    // Repeated to 18 cards (not just the original 6) so this also clears both
    // MIN_CARDS and the estimated-reading-time floor — a day needs enough
    // length, in cards and in words, to be a session, not just enough shape
    // to pass the rest.
    const base: Array<Partial<Card>> = [
      { excerpt: "Short one, just to set the floor of the spread." },
      {
        media: ["a.jpg", "b.jpg", "c.jpg"],
        excerpt:
          "A carousel card can still carry real text alongside its several images, " +
          "rather than leaving all the reading to the cards around it.",
      },
      {
        excerpt:
          "A considerably longer excerpt that runs on for several clauses and sentences, " +
          "the kind meant to be read slowly rather than skimmed on the way past. " +
          "It keeps going for a while yet, because some cards in a real day are meant " +
          "to be dense rather than quick, and the estimate has to reflect that weight. " +
          "Only then, after all of that, does it finally stop for good.",
      },
      { excerpt: "" },
      {
        media: ["d.jpg", "e.jpg"],
        excerpt:
          "A second carousel, again with a real excerpt attached to it instead of " +
          "standing in as a bare image-only card the way the led card already does.",
      },
      {
        excerpt:
          "Another middling excerpt, several sentences long this time rather than one. " +
          "It gives the reading-time estimate something to add up across every card, " +
          "the way a real curated day full of genuine variation would, " +
          "rather than a handful of clipped one-liners that never add up to a session.",
      },
    ];
    const cards: Card[] = Array.from({ length: 18 }, (_, i) => {
      const preset = base[i % base.length];
      // A unique per-index image when the preset doesn't specify its own media,
      // so this fixture doesn't itself trip the "no image over 25% of a day's
      // cards" rule via the card() helper's shared default media.
      return card({ url: `https://x.test/${i}`, media: preset.media ?? [`https://x.test/${i}.jpg`], ...preset });
    });
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

  it("flags an image that dominates a day, even when every other rule passes", () => {
    // A real control: 18 cards, 18 distinct articles, 2 carousels, an image-led
    // card, a wide excerpt spread, and no two near-empty cards back to back —
    // every existing rule is satisfied. The only defect is that "shared.jpg"
    // was used to pad more than a quarter of the day's cards, which is exactly
    // the "same photo all day" bug this rule exists to catch.
    const cards: Card[] = Array.from({ length: 18 }, (_, i) => {
      if (i === 0) return card({ url: "https://x.test/0", media: ["a.jpg", "b.jpg", "c.jpg"], excerpt: "" });
      if (i === 1) {
        return card({
          url: "https://x.test/1",
          media: ["d.jpg", "e.jpg"],
          excerpt:
            "A considerably longer excerpt that runs on for several clauses and sentences. " +
            "It keeps going, because some cards are meant to be dense. And then it stops.",
        });
      }
      // Cards 2-11 (10 of 18, well over 25%) all carry "shared.jpg".
      const media = i < 12 ? ["shared.jpg"] : [`https://x.test/${i}.jpg`];
      return card({
        url: `https://x.test/${i}`,
        media,
        excerpt: `A middling excerpt, number ${i}, long enough to spread lengths out.`,
      });
    });
    expect(varietyViolations(day(cards)).join(" ")).toMatch(/shared\.jpg/);
  });

  it("flags a card whose copy promises multiple images but has only one", () => {
    // A real control: 18 cards, 18 distinct articles, 2 carousels, an image-led
    // card, a wide excerpt spread, no two near-empty cards back to back, and no
    // image over 25% of the day — every other rule is satisfied. The only
    // defect is card 2's "in parts" detail/connector over a single image,
    // exactly the bug where an exhausted padding pool left multi-image copy
    // on a carousel that got no second image.
    const cards: Card[] = Array.from({ length: 18 }, (_, i) => {
      if (i === 0) return card({ url: "https://x.test/0", media: ["a.jpg", "b.jpg", "c.jpg"], excerpt: "" });
      if (i === 1) {
        return card({
          url: "https://x.test/1",
          media: ["d.jpg", "e.jpg"],
          excerpt:
            "A considerably longer excerpt that runs on for several clauses and sentences. " +
            "It keeps going, because some cards are meant to be dense. And then it stops.",
        });
      }
      if (i === 2) {
        return card({
          url: "https://x.test/2",
          media: ["f.jpg"],
          detail: "Ede & Ravenscroft · in parts",
          connector: "Swipe sideways — one idea, several parts.",
          excerpt: "A middling excerpt, number 2, long enough to spread lengths out.",
        });
      }
      return card({
        url: `https://x.test/${i}`,
        media: [`https://x.test/${i}.jpg`],
        excerpt: `A middling excerpt, number ${i}, long enough to spread lengths out.`,
      });
    });
    expect(varietyViolations(day(cards)).join(" ")).toMatch(/in parts/);
  });

  it("flags the same image on two adjacent cards, even when every other rule passes", () => {
    // A real control: 18 cards, 18 distinct articles, 2 carousels, an image-led
    // card, a wide excerpt spread, no two near-empty cards back to back, and no
    // image over 25% of the day — every other rule is satisfied. The only
    // defect is that card 4 repeats an image card 3 already showed, which is
    // exactly the case the owner noticed and asked to be fixed.
    const long =
      "A considerably longer excerpt that runs on for several clauses and sentences. " +
      "It keeps going, because some cards are meant to be dense. And then it stops.";
    const cards: Card[] = Array.from({ length: 18 }, (_, i) => {
      if (i === 0) return card({ url: "https://x.test/0", media: ["a.jpg", "b.jpg", "c.jpg"], excerpt: "" });
      if (i === 1) return card({ url: "https://x.test/1", media: ["d.jpg", "e.jpg"], excerpt: long });
      if (i === 3) return card({ url: "https://x.test/3", media: ["repeat.jpg"], excerpt: `A middling excerpt, number 3, long enough to spread lengths out.` });
      if (i === 4) return card({ url: "https://x.test/4", media: ["repeat.jpg"], excerpt: `A middling excerpt, number 4, long enough to spread lengths out.` });
      return card({ url: `https://x.test/${i}`, media: [`https://x.test/${i}.jpg`], excerpt: `A middling excerpt, number ${i}, long enough to spread lengths out.` });
    });
    expect(varietyViolations(day(cards)).join(" ")).toMatch(/repeat\.jpg.*adjacent|adjacent.*repeat\.jpg/i);
  });

  it("accepts an empty day, which is not filler yet", () => {
    expect(varietyViolations(day([]))).toEqual([]);
  });

  // A Monday-only assertion misses exactly the kind of bug that hit 6 of 7
  // days at once (the filler's per-day image padding), so check every day.
  it.each(DAY_NAMES)("holds for the committed %s deck", (dayName) => {
    const found = getDay(getDeck(), dayName)!;
    expect(varietyViolations(found)).toEqual([]);
  });
});
