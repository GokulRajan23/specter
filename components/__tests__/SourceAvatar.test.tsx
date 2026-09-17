import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SourceAvatar, avatarSrc, monogram } from "@/components/SourceAvatar";

describe("avatarSrc", () => {
  it("uses the Commons mark for Wikipedia", () => {
    expect(avatarSrc("en.wikipedia.org")).toContain("Wikipedia-logo-v2.svg");
  });

  it("falls back to a 128px favicon for any other domain", () => {
    const src = avatarSrc("gsmarena.com");
    expect(src).toContain("gsmarena.com");
    expect(src).toContain("sz=128");
  });
});

describe("monogram", () => {
  it("takes the first letter, uppercased", () => {
    expect(monogram("wikipedia")).toBe("W");
    expect(monogram("GSMArena")).toBe("G");
  });

  it("falls back to a question mark for an empty name", () => {
    expect(monogram("")).toBe("?");
  });
});

describe("SourceAvatar", () => {
  it("renders an image labelled with the source", () => {
    render(<SourceAvatar source="Wikipedia" domain="en.wikipedia.org" />);
    expect(screen.getByAltText("Wikipedia")).toBeInTheDocument();
  });

  it("replaces the image with a monogram when it fails to load", () => {
    render(<SourceAvatar source="Wikipedia" domain="en.wikipedia.org" />);
    fireEvent.error(screen.getByAltText("Wikipedia"));
    expect(screen.queryByAltText("Wikipedia")).not.toBeInTheDocument();
    expect(screen.getByText("W")).toBeInTheDocument();
  });
});
