import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { loadSaved, isSaved, toggleSaved, clearSaved, type SavedCard } from "@/lib/saved";

const cardA: SavedCard = {
  url: "https://example.test/article",
  day: "monday",
  source: "Example",
  detail: "Article · lead",
  excerpt: "First excerpt.",
  image: "https://example.test/a.jpg",
  savedAt: 1000,
};

const cardB: SavedCard = {
  // Same article as cardA, different card within it.
  url: "https://example.test/article",
  day: "monday",
  source: "Example",
  detail: "Article · quote",
  excerpt: "Second excerpt.",
  image: null,
  savedAt: 2000,
};

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("loadSaved", () => {
  it("returns an empty array when nothing is stored", () => {
    expect(loadSaved()).toEqual([]);
  });

  it("returns an empty array when the stored value is malformed JSON", () => {
    window.localStorage.setItem("specter.saved.v1", "{not json");
    expect(loadSaved()).toEqual([]);
  });

  it("returns an empty array when the stored value has the wrong shape", () => {
    window.localStorage.setItem("specter.saved.v1", '{"oops":true}');
    expect(loadSaved()).toEqual([]);
  });

  it("returns an empty array when stored entries are partially malformed", () => {
    window.localStorage.setItem(
      "specter.saved.v1",
      JSON.stringify([{ url: "https://x.test", day: "monday" }]),
    );
    expect(loadSaved()).toEqual([]);
  });

  it("does not hand back a shared mutable constant", () => {
    const a = loadSaved();
    const b = loadSaved();
    expect(a).not.toBe(b);
  });
});

describe("toggleSaved", () => {
  it("round-trips a saved card", () => {
    const next = toggleSaved(cardA);
    expect(next).toEqual([cardA]);
    expect(loadSaved()).toEqual([cardA]);
  });

  it("toggles a card off again", () => {
    toggleSaved(cardA);
    const next = toggleSaved(cardA);
    expect(next).toEqual([]);
    expect(loadSaved()).toEqual([]);
  });

  it("returns a fresh array rather than mutating in place", () => {
    const first = toggleSaved(cardA);
    const second = toggleSaved(cardB);
    expect(first).not.toBe(second);
    expect(first).toEqual([cardA]);
  });

  it("keeps two cards from the same article independent", () => {
    toggleSaved(cardA);
    toggleSaved(cardB);
    expect(isSaved(loadSaved(), cardA.url, cardA.detail)).toBe(true);
    expect(isSaved(loadSaved(), cardB.url, cardB.detail)).toBe(true);

    // Toggling one off must not touch its sibling from the same article.
    toggleSaved(cardA);
    expect(isSaved(loadSaved(), cardA.url, cardA.detail)).toBe(false);
    expect(isSaved(loadSaved(), cardB.url, cardB.detail)).toBe(true);
  });
});

describe("isSaved", () => {
  it("is false for an empty list", () => {
    expect(isSaved([], cardA.url, cardA.detail)).toBe(false);
  });

  it("matches on url and detail together, not url alone", () => {
    expect(isSaved([cardA], cardB.url, cardB.detail)).toBe(false);
    expect(isSaved([cardA], cardA.url, cardA.detail)).toBe(true);
  });
});

describe("clearSaved", () => {
  it("empties the store", () => {
    toggleSaved(cardA);
    clearSaved();
    expect(loadSaved()).toEqual([]);
  });
});

describe("resilience", () => {
  it("does not throw when localStorage rejects a write", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    expect(() => toggleSaved(cardA)).not.toThrow();
  });

  it("does not throw when localStorage rejects a read", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    expect(loadSaved()).toEqual([]);
  });
});
