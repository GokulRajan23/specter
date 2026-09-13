import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Page from "@/app/page";

describe("test harness", () => {
  it("renders a React component through jsdom", () => {
    render(<Page />);
    expect(screen.getByText("Specter")).toBeInTheDocument();
  });
});
