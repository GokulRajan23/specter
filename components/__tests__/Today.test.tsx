import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { Today } from "@/components/Today";
import { DAY_NAMES, type DayPreview } from "@/lib/content";
import { currentDayName } from "@/lib/schedule";
import { markComplete } from "@/lib/progress";
import { toggleSaved, type SavedCard } from "@/lib/saved";

const today = currentDayName(new Date());

function preview(day: (typeof DAY_NAMES)[number]): DayPreview {
  return {
    day,
    slot: `${day} slot`,
    cardCount: 5,
    card: {
      source: `${day} source`,
      domain: "example.test",
      detail: `${day} detail`,
      image: `https://example.test/${day}.jpg`,
      excerpt: `${day} excerpt.`,
    },
  };
}

/** Every day gets a distinct preview so a test can tell whether Today
 * picked the right one; `patch` overrides just today's entry. */
function previews(patch: Partial<DayPreview> = {}): DayPreview[] {
  return DAY_NAMES.map((day) =>
    day === today ? { ...preview(day), ...patch } : preview(day),
  );
}

const saved: SavedCard = {
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
  it("shows the topic and today's position", async () => {
    render(<Today topic="Suits" previews={previews()} />);
    expect(screen.getByText("Suits")).toBeInTheDocument();
    expect(await screen.findByText(/\d of 7/)).toBeInTheDocument();
  });

  it("hides the Saved link when nothing is saved", async () => {
    render(<Today topic="Suits" previews={previews()} />);
    expect(await screen.findByText("Suits")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /saved/i })).not.toBeInTheDocument();
  });

  it("shows a Saved (n) link once cards are saved", async () => {
    toggleSaved(saved);
    render(<Today topic="Suits" previews={previews()} />);

    const link = await screen.findByRole("link", { name: /saved \(1\)/i });
    expect(link).toHaveAttribute("href", "/saved");
  });

  it("previews today's card in the feed's visual language, linking into the day", async () => {
    render(<Today topic="Suits" previews={previews()} />);

    const link = await screen.findByRole("link", { name: /tap to begin/i });
    expect(link).toHaveAttribute("href", `/day/${today}`);
    expect(within(link).getByText(`${today} source`)).toBeInTheDocument();
    expect(within(link).getByText(`${today} detail`)).toBeInTheDocument();
    expect(within(link).getByText(`${today} excerpt.`)).toBeInTheDocument();
    // Two <img>s live in the card: the SourceAvatar and the preview image
    // itself — distinguish them by alt text (source vs. detail).
    expect(within(link).getByAltText(`${today} detail`)).toHaveAttribute(
      "src",
      `https://example.test/${today}.jpg`,
    );
  });

  it("shows the day's slot in the section heading", async () => {
    render(<Today topic="Suits" previews={previews()} />);
    expect(await screen.findByText(`Today · ${today} slot`)).toBeInTheDocument();
  });

  it("falls back to a text-only preview when today has no card with an image", async () => {
    render(
      <Today
        topic="Suits"
        previews={previews({
          card: {
            source: `${today} source`,
            domain: "example.test",
            detail: `${today} detail`,
            image: null,
            excerpt: `${today} excerpt.`,
          },
        })}
      />,
    );

    const link = await screen.findByRole("link", { name: /tap to begin/i });
    // Only the SourceAvatar's <img> remains — no card image to preview.
    expect(within(link).queryByAltText(`${today} detail`)).not.toBeInTheDocument();
    expect(within(link).getByText(`${today} excerpt.`)).toBeInTheDocument();
  });

  it("invites a replay once today is already complete", async () => {
    markComplete(today);
    render(<Today topic="Suits" previews={previews()} />);

    const link = await screen.findByRole("link", { name: /replay today/i });
    expect(link).toHaveAttribute("href", `/day/${today}`);
    expect(screen.queryByText(/tap to begin/i)).not.toBeInTheDocument();
  });
});
