import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const css = readFileSync("app/globals.css", "utf8");
// Only the light-mode block, before the dark-mode media query overrides it —
// otherwise a regex for --color-ink would just match whichever comes first.
const lightModeCss = css.split("@media (prefers-color-scheme: dark)")[0];

describe("theme tokens", () => {
  it("uses Instagram's off-black ink in light mode, not pure black", () => {
    const match = lightModeCss.match(/--color-ink:\s*(#[0-9a-fA-F]{6})/);
    expect(match?.[1].toLowerCase()).toBe("#262626");
    expect(match?.[1].toLowerCase()).not.toBe("#000000");
  });
});
