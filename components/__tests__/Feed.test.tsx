import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Feed } from "@/components/Feed";
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

// jsdom has no IntersectionObserver implementation. This fake records every
// instance created so a test can reach in and fire an intersection change for
// whichever element Feed observed (the DayEnd card).
class FakeIntersectionObserver {
  static instances: FakeIntersectionObserver[] = [];
  private elements: Element[] = [];
  constructor(private callback: IntersectionObserverCallback) {
    FakeIntersectionObserver.instances.push(this);
  }
  observe(el: Element) {
    this.elements.push(el);
  }
  unobserve() {}
  disconnect() {}
  trigger(isIntersecting: boolean) {
    const entries = this.elements.map(
      (target) => ({ isIntersecting, target }) as IntersectionObserverEntry,
    );
    this.callback(entries, this as unknown as IntersectionObserver);
  }
}

beforeEach(() => {
  window.localStorage.clear();
  scrollHeightDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "scrollHeight");
  clientHeightDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "clientHeight");
  FakeIntersectionObserver.instances = [];
  vi.stubGlobal("IntersectionObserver", FakeIntersectionObserver);
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
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Feed", () => {
  it("renders every card in the day", () => {
    render(<Feed day={day} />);
    expect(screen.getByText("First card.")).toBeInTheDocument();
    expect(screen.getByText("Second card.")).toBeInTheDocument();
  });

  it("ends with the day-end card naming the day", () => {
    render(<Feed day={day} />);
    // Typographic apostrophe (U+2019): DayEnd renders &rsquo;, not ASCII '.
    expect(screen.getByText("That’s Monday.")).toBeInTheDocument();
  });

  it("reports the number of cards in the day end", () => {
    render(<Feed day={day} />);
    expect(screen.getByText(/2 cards/)).toBeInTheDocument();
  });

  it("does not render a header topic name or a progress bar", () => {
    render(<Feed day={day} />);
    expect(screen.queryByText("Suits")).not.toBeInTheDocument();
    expect(screen.queryByTestId("progress")).not.toBeInTheDocument();
  });

  it("links back to Today from both the floating back button and the day-end card", () => {
    render(<Feed day={day} />);
    const backLinks = screen.getAllByRole("link", { name: /back to today/i });
    expect(backLinks).toHaveLength(2);
    for (const link of backLinks) {
      expect(link).toHaveAttribute("href", "/");
    }
  });
});

describe("Feed completion tracking", () => {
  it("marks a short feed complete on mount", () => {
    stubContainerSize(400, 800);
    render(<Feed day={day} />);
    expect(loadProgress().completed).toContain("monday");
  });

  it("does not mark a long feed complete on mount", () => {
    stubContainerSize(2000, 800);
    render(<Feed day={day} />);
    expect(loadProgress().completed).not.toContain("monday");
  });

  it("marks complete when the day-end card becomes visible", () => {
    stubContainerSize(2000, 800);
    render(<Feed day={day} />);
    expect(loadProgress().completed).not.toContain("monday");

    const observer = FakeIntersectionObserver.instances.at(-1);
    expect(observer).toBeDefined();
    observer!.trigger(true);
    expect(loadProgress().completed).toContain("monday");
  });

  it("does not mark complete while the day-end card is not intersecting", () => {
    stubContainerSize(2000, 800);
    render(<Feed day={day} />);

    const observer = FakeIntersectionObserver.instances.at(-1);
    observer!.trigger(false);
    expect(loadProgress().completed).not.toContain("monday");
  });

  it("does not mark complete a second time once the day-end card intersects", () => {
    stubContainerSize(2000, 800);
    render(<Feed day={day} />);
    const observer = FakeIntersectionObserver.instances.at(-1);

    observer!.trigger(true);
    const spy = vi.spyOn(progressModule, "markComplete");
    observer!.trigger(true);
    expect(spy).not.toHaveBeenCalled();
  });
});
