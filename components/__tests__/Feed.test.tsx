import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Feed, scrollProgress } from "@/components/Feed";
import type { Day } from "@/lib/content";
import { loadProgress } from "@/lib/progress";
import * as progressModule from "@/lib/progress";

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

let scrollHeightDescriptor: PropertyDescriptor | undefined;
let clientHeightDescriptor: PropertyDescriptor | undefined;

// jsdom reports scrollHeight/clientHeight as 0 for every element (no real
// layout), so the short-feed and long-feed cases are otherwise indistinguishable.
// Stubbing on the prototype makes ref.current report the sizes a test wants.
function stubContainerSize(scrollHeight: number, clientHeight: number) {
  Object.defineProperty(HTMLElement.prototype, "scrollHeight", {
    configurable: true,
    get: () => scrollHeight,
  });
  Object.defineProperty(HTMLElement.prototype, "clientHeight", {
    configurable: true,
    get: () => clientHeight,
  });
}

function scroller(): HTMLElement {
  const el = document.querySelector(".no-bars");
  if (!el) throw new Error("scroll container not found");
  return el as HTMLElement;
}

function scrollTo(scrollTop: number) {
  Object.defineProperty(scroller(), "scrollTop", { configurable: true, value: scrollTop });
  fireEvent.scroll(scroller());
}

beforeEach(() => {
  window.localStorage.clear();
  scrollHeightDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "scrollHeight");
  clientHeightDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "clientHeight");
});

afterEach(() => {
  if (scrollHeightDescriptor) {
    Object.defineProperty(HTMLElement.prototype, "scrollHeight", scrollHeightDescriptor);
  } else {
    delete (HTMLElement.prototype as Record<string, unknown>).scrollHeight;
  }
  if (clientHeightDescriptor) {
    Object.defineProperty(HTMLElement.prototype, "clientHeight", clientHeightDescriptor);
  } else {
    delete (HTMLElement.prototype as Record<string, unknown>).clientHeight;
  }
  vi.restoreAllMocks();
});

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

describe("Feed completion tracking", () => {
  it("marks a short feed complete on mount", () => {
    stubContainerSize(400, 800);
    render(<Feed day={day} topic="Suits" />);
    expect(loadProgress().completed).toContain("monday");
  });

  it("does not mark a long feed complete on mount", () => {
    stubContainerSize(2000, 800);
    render(<Feed day={day} topic="Suits" />);
    expect(loadProgress().completed).not.toContain("monday");
  });

  it("marks complete when scrolled to the bottom", () => {
    stubContainerSize(2000, 800);
    render(<Feed day={day} topic="Suits" />);
    expect(loadProgress().completed).not.toContain("monday");

    scrollTo(1200);
    expect(loadProgress().completed).toContain("monday");
  });

  it("does not re-invoke setLastCard when the computed index has not changed", () => {
    stubContainerSize(2000, 800);
    const spy = vi.spyOn(progressModule, "setLastCard");
    render(<Feed day={day} topic="Suits" />);

    scrollTo(100);
    const callsAfterFirstScroll = spy.mock.calls.length;
    expect(callsAfterFirstScroll).toBeGreaterThan(0);

    scrollTo(100);
    expect(spy.mock.calls.length).toBe(callsAfterFirstScroll);
  });
});
