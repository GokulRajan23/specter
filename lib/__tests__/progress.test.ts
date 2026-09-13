import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  EMPTY_PROGRESS,
  loadProgress,
  saveProgress,
  markComplete,
  setLastCard,
  isComplete,
} from "@/lib/progress";

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("loadProgress", () => {
  it("returns empty progress when nothing is stored", () => {
    expect(loadProgress()).toEqual(EMPTY_PROGRESS);
  });

  it("returns empty progress when the stored value is malformed", () => {
    window.localStorage.setItem("specter.progress.v1", "{not json");
    expect(loadProgress()).toEqual(EMPTY_PROGRESS);
  });

  it("returns empty progress when the stored value has the wrong shape", () => {
    window.localStorage.setItem("specter.progress.v1", '{"completed":"nope"}');
    expect(loadProgress()).toEqual(EMPTY_PROGRESS);
  });

  it("round-trips saved progress", () => {
    saveProgress({ completed: ["monday"], lastCard: { monday: 4 } });
    expect(loadProgress()).toEqual({ completed: ["monday"], lastCard: { monday: 4 } });
  });
});

describe("markComplete", () => {
  it("records a day as complete", () => {
    const p = markComplete("monday");
    expect(p.completed).toContain("monday");
    expect(isComplete(loadProgress(), "monday")).toBe(true);
  });

  it("does not duplicate a day completed twice", () => {
    markComplete("monday");
    const p = markComplete("monday");
    expect(p.completed).toEqual(["monday"]);
  });
});

describe("setLastCard", () => {
  it("stores the furthest card reached", () => {
    setLastCard("monday", 3);
    expect(loadProgress().lastCard.monday).toBe(3);
  });

  it("never moves the marker backwards", () => {
    setLastCard("monday", 7);
    setLastCard("monday", 2);
    expect(loadProgress().lastCard.monday).toBe(7);
  });
});

describe("resilience", () => {
  it("does not throw when localStorage rejects a write", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    expect(() => markComplete("monday")).not.toThrow();
  });

  it("does not throw when localStorage rejects a read", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    expect(loadProgress()).toEqual(EMPTY_PROGRESS);
  });
});
