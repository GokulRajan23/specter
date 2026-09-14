import { describe, it, expect } from "vitest";
import { DAY_NAMES, DAY_LABELS, dayIndex, isDayName } from "@/lib/content";

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
