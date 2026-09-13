import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { metadata, viewport } from "@/app/layout";

const manifest = JSON.parse(readFileSync("public/manifest.json", "utf8"));

describe("manifest", () => {
  it("opens without browser chrome", () => {
    expect(manifest.display).toBe("standalone");
  });

  it("is named Specter", () => {
    expect(manifest.name).toBe("Specter");
    expect(manifest.short_name).toBe("Specter");
  });

  it("starts on the Today screen", () => {
    expect(manifest.start_url).toBe("/");
  });

  it("declares both icon sizes", () => {
    const sizes = manifest.icons.map((i: { sizes: string }) => i.sizes);
    expect(sizes).toContain("192x192");
    expect(sizes).toContain("512x512");
  });

  it("matches the dark app background", () => {
    expect(manifest.background_color).toBe("#000000");
  });
});

describe("document metadata", () => {
  it("declares the apple touch icon, which iOS uses instead of the manifest", () => {
    expect(JSON.stringify(metadata.icons)).toContain("apple-touch-icon.png");
  });

  it("marks itself web-app capable for iOS", () => {
    expect(metadata.appleWebApp).toMatchObject({ capable: true });
  });

  it("extends under the notch and home indicator", () => {
    expect(viewport.viewportFit).toBe("cover");
  });

  it("does not let the page be pinch-zoomed like a document", () => {
    expect(viewport.userScalable).toBe(false);
  });

  it("themes the status bar for both colour schemes", () => {
    expect(viewport.themeColor).toEqual([
      { media: "(prefers-color-scheme: light)", color: "#ffffff" },
      { media: "(prefers-color-scheme: dark)", color: "#000000" },
    ]);
  });
});
