import { describe, it, expect } from "vitest";
import { currentDayName, isOpenable, circleState } from "@/lib/schedule";

describe("currentDayName", () => {
  it("maps JS Sunday-first weekdays onto a Monday-first week", () => {
    // 2026-09-13 is a Sunday, 2026-09-14 a Monday.
    expect(currentDayName(new Date("2026-09-13T12:00:00"))).toBe("sunday");
    expect(currentDayName(new Date("2026-09-14T12:00:00"))).toBe("monday");
    expect(currentDayName(new Date("2026-09-17T12:00:00"))).toBe("thursday");
  });
});

describe("isOpenable", () => {
  it("opens today", () => {
    expect(isOpenable("thursday", "thursday", false)).toBe(true);
  });

  it("opens past days for replay", () => {
    expect(isOpenable("monday", "thursday", false)).toBe(true);
  });

  it("locks future days", () => {
    expect(isOpenable("friday", "thursday", false)).toBe(false);
  });

  it("opens everything under the dev flag", () => {
    expect(isOpenable("sunday", "monday", true)).toBe(true);
  });
});

describe("circleState", () => {
  it("marks a completed day done", () => {
    expect(circleState("monday", "thursday", ["monday"], false)).toBe("done");
  });

  it("marks today as today even when incomplete", () => {
    expect(circleState("thursday", "thursday", [], false)).toBe("today");
  });

  it("prefers done over today when today is already finished", () => {
    expect(circleState("thursday", "thursday", ["thursday"], false)).toBe("done");
  });

  it("marks an unfinished past day as past, not locked", () => {
    expect(circleState("tuesday", "thursday", ["monday"], false)).toBe("past");
  });

  it("marks future days locked", () => {
    expect(circleState("saturday", "thursday", [], false)).toBe("locked");
  });

  it("unlocks future days under the dev flag", () => {
    expect(circleState("saturday", "thursday", [], true)).toBe("past");
  });
});
