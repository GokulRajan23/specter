import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { Feed, scrollProgress } from "@/components/Feed";
import type { Day } from "@/lib/content";

const day: Day = {
  day: "monday",
  slot: "The map",
  cards: [
    {
      source: "Wikipedia",
      domain: "en.wikipedia.org",
      detail: "Suit (clothing) · lead",
      url: "https://en.wikipedia.org/wiki/Suit_(clothing)",
      media: ["a.jpg"],
      excerpt: "First card.",
      connector: "One.",
    },
    {
      source: "Wikipedia",
      domain: "en.wikipedia.org",
      detail: "Savile Row",
      url: "https://en.wikipedia.org/wiki/Savile_Row",
      media: ["b.jpg", "c.jpg"],
      excerpt: "Second card.",
      connector: "Two.",
    },
  ],
};

beforeEach(() => window.localStorage.clear());

describe("scrollProgress", () => {
  it("never reads as empty, so the bar is always visible", () => {
    expect(scrollProgress(0, 2000, 800)).toBeCloseTo(0.06);
  });

  it("reaches one at the bottom", () => {
    expect(scrollProgress(1200, 2000, 800)).toBe(1);
  });

  it("is proportional in between", () => {
    expect(scrollProgress(600, 2000, 800)).toBeCloseTo(0.5);
  });

  it("returns the floor when the content does not overflow", () => {
    expect(scrollProgress(0, 500, 800)).toBeCloseTo(0.06);
  });

  it("clamps elastic overscroll past the bottom", () => {
    expect(scrollProgress(5000, 2000, 800)).toBe(1);
  });
});

describe("Feed", () => {
  it("renders every card in the day", () => {
    render(<Feed day={day} topic="Suits" />);
    expect(screen.getByText("First card.")).toBeInTheDocument();
    expect(screen.getByText("Second card.")).toBeInTheDocument();
  });

  it("shows the topic and the day label", () => {
    render(<Feed day={day} topic="Suits" />);
    expect(screen.getByText("Suits")).toBeInTheDocument();
    // Anchored so it does not also match "That’s Monday." in the day-end card.
    expect(screen.getByText(/Mon · 1 of 7/)).toBeInTheDocument();
  });

  it("ends with the day-end card naming the day", () => {
    render(<Feed day={day} topic="Suits" />);
    // Typographic apostrophe (U+2019): DayEnd renders &rsquo;, not ASCII '.
    expect(screen.getByText("That’s Monday.")).toBeInTheDocument();
  });

  it("reports the number of cards in the day end", () => {
    render(<Feed day={day} topic="Suits" />);
    expect(screen.getByText(/2 cards/)).toBeInTheDocument();
  });
});
