import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Post } from "@/components/Post";
import type { Card } from "@/lib/content";

const card: Card = {
  source: "Wikipedia",
  domain: "en.wikipedia.org",
  detail: "Suit (clothing) · lead",
  url: "https://en.wikipedia.org/wiki/Suit_(clothing)",
  media: ["https://example.test/a.jpg"],
  excerpt: "A suit is a set of clothes of identical textiles.",
  connector: "Start with the word itself.",
};

describe("Post", () => {
  it("shows the publisher and the detail line", () => {
    render(<Post card={card} day="monday" />);
    expect(screen.getByText("Wikipedia")).toBeInTheDocument();
    expect(screen.getByText("Suit (clothing) · lead")).toBeInTheDocument();
  });

  it("shows the excerpt and the connector", () => {
    render(<Post card={card} day="monday" />);
    expect(screen.getByText(card.excerpt)).toBeInTheDocument();
    expect(screen.getByText(card.connector)).toBeInTheDocument();
  });

  it("links to the source, opening safely in a new tab", () => {
    render(<Post card={card} day="monday" />);
    const link = screen.getByRole("link", { name: /view source/i });
    expect(link).toHaveAttribute("href", card.url);
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("suppresses the iOS long-press callout", () => {
    const { container } = render(<Post card={card} day="monday" />);
    expect(container.querySelector("article")).toHaveClass("no-callout");
  });

  it("renders a carousel when the card has several images", () => {
    render(<Post card={{ ...card, media: ["a.jpg", "b.jpg"] }} day="monday" />);
    expect(screen.getByText("1/2")).toBeInTheDocument();
  });

  it("shows a save button beside the source link, with spacing between them", () => {
    const { container } = render(<Post card={card} day="monday" />);
    expect(screen.getByRole("button", { name: "Save card" })).toBeInTheDocument();
    expect(container.querySelector(".flex.items-center.gap-4")).toBeInTheDocument();
  });
});
