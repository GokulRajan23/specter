import { describe, it, expect } from "vitest";
import DayPage from "@/app/day/[day]/page";

describe("DayPage", () => {
  it("calls notFound() for a day name that doesn't exist", async () => {
    await expect(DayPage({ params: Promise.resolve({ day: "funday" }) })).rejects.toMatchObject({
      digest: expect.stringContaining("404"),
    });
  });

  it("renders the feed for a real day", async () => {
    const result = await DayPage({ params: Promise.resolve({ day: "monday" }) });
    expect(result).toBeTruthy();
  });
});
