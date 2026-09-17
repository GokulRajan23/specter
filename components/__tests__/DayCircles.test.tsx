import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DayCircles } from "@/components/DayCircles";

describe("DayCircles", () => {
  it("renders seven circles", () => {
    render(<DayCircles today="thursday" completed={[]} dev={false} />);
    expect(screen.getAllByTestId("day-circle")).toHaveLength(7);
  });

  it("links days that are open", () => {
    render(<DayCircles today="thursday" completed={[]} dev={false} />);
    expect(screen.getByRole("link", { name: /monday/i })).toHaveAttribute("href", "/day/monday");
  });

  it("does not link locked future days", () => {
    render(<DayCircles today="thursday" completed={[]} dev={false} />);
    expect(screen.queryByRole("link", { name: /saturday/i })).not.toBeInTheDocument();
  });

  it("links every day under the dev flag", () => {
    render(<DayCircles today="monday" completed={[]} dev={true} />);
    expect(screen.getAllByRole("link")).toHaveLength(7);
  });

  it("marks completed days for assistive tech", () => {
    render(<DayCircles today="thursday" completed={["monday"]} dev={false} />);
    expect(screen.getByRole("link", { name: /monday, done/i })).toBeInTheDocument();
  });
});
