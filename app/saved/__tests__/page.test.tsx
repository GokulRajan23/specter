import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import SavedPage from "@/app/saved/page";
import { toggleSaved, type SavedCard } from "@/lib/saved";

const older: SavedCard = {
  url: "https://example.test/first",
  day: "monday",
  source: "First Source",
  detail: "First · lead",
  excerpt: "Older excerpt.",
  image: null,
  savedAt: 1000,
};

const newer: SavedCard = {
  url: "https://example.test/second",
  day: "tuesday",
  source: "Second Source",
  detail: "Second · lead",
  excerpt: "Newer excerpt.",
  image: null,
  savedAt: 2000,
};

beforeEach(() => {
  window.localStorage.clear();
});

describe("SavedPage", () => {
  it("shows a quiet empty state with no saved cards", async () => {
    render(<SavedPage />);
    expect(await screen.findByText(/saving a card keeps it here/i)).toBeInTheDocument();
    expect(screen.queryByText(/!/)).not.toBeInTheDocument();
  });

  it("has a back link to Today", () => {
    render(<SavedPage />);
    expect(screen.getByRole("link", { name: /back to today/i })).toHaveAttribute("href", "/");
  });

  it("lists saved cards newest first", async () => {
    toggleSaved(older);
    toggleSaved(newer);
    render(<SavedPage />);

    const sources = await screen.findAllByText(/Source$/);
    expect(sources.map((el) => el.textContent)).toEqual(["Second Source", "First Source"]);
  });

  it("shows each card's day and links to its article", async () => {
    toggleSaved(older);
    render(<SavedPage />);

    expect(await screen.findByText("Mon")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /first source/i });
    expect(link).toHaveAttribute("href", older.url);
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });
});
