import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { Today } from "@/components/Today";
import { toggleSaved, type SavedCard } from "@/lib/saved";

const card: SavedCard = {
  url: "https://example.test/article",
  day: "monday",
  source: "Example",
  detail: "Article · lead",
  excerpt: "An excerpt.",
  image: null,
  savedAt: 1,
};

beforeEach(() => {
  window.localStorage.clear();
});

describe("Today", () => {
  it("shows the topic and week", () => {
    render(<Today topic="Suits" week={3} />);
    expect(screen.getByText("Suits")).toBeInTheDocument();
    expect(screen.getByText("Week 3")).toBeInTheDocument();
  });

  it("hides the Saved link when nothing is saved", async () => {
    render(<Today topic="Suits" week={3} />);
    expect(await screen.findByText("Suits")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /saved/i })).not.toBeInTheDocument();
  });

  it("shows a Saved (n) link once cards are saved", async () => {
    toggleSaved(card);
    render(<Today topic="Suits" week={3} />);

    const link = await screen.findByRole("link", { name: /saved \(1\)/i });
    expect(link).toHaveAttribute("href", "/saved");
  });
});
