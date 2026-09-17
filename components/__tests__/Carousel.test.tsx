import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { Carousel, activeIndex } from "@/components/Carousel";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("activeIndex", () => {
  it("is zero at rest", () => {
    expect(activeIndex(0, 300, 3)).toBe(0);
  });

  it("rounds to the nearest page", () => {
    expect(activeIndex(140, 300, 3)).toBe(0);
    expect(activeIndex(160, 300, 3)).toBe(1);
    expect(activeIndex(600, 300, 3)).toBe(2);
  });

  it("never exceeds the last page", () => {
    expect(activeIndex(9999, 300, 3)).toBe(2);
  });

  it("never goes below zero on elastic overscroll", () => {
    expect(activeIndex(-40, 300, 3)).toBe(0);
  });

  it("returns zero when width is unmeasured", () => {
    expect(activeIndex(0, 0, 3)).toBe(0);
  });
});

describe("Carousel", () => {
  it("renders one image per media entry", () => {
    render(<Carousel media={["a.jpg", "b.jpg", "c.jpg"]} alt="Waistcoat" />);
    expect(screen.getAllByRole("img")).toHaveLength(3);
  });

  it("shows dots and a counter when there is more than one image", () => {
    render(<Carousel media={["a.jpg", "b.jpg"]} alt="Waistcoat" />);
    expect(screen.getByText("1/2")).toBeInTheDocument();
    expect(screen.getByTestId("dots").children).toHaveLength(2);
  });

  it("shows no dots or counter for a single image", () => {
    render(<Carousel media={["a.jpg"]} alt="Waistcoat" />);
    expect(screen.queryByTestId("dots")).not.toBeInTheDocument();
    expect(screen.queryByText("1/1")).not.toBeInTheDocument();
  });

  it("renders every entry, including a repeated image, without a duplicate-key warning", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    render(<Carousel media={["a.jpg", "b.jpg", "a.jpg"]} alt="Waistcoat" />);
    expect(screen.getAllByRole("img")).toHaveLength(3);
    const keyWarnings = error.mock.calls.filter((call) =>
      String(call[0]).includes("Encountered two children with the same key"),
    );
    expect(keyWarnings).toHaveLength(0);
  });
});
