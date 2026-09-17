"use client";

import { useEffect, useState } from "react";
import type { DayName } from "@/lib/content";
import { loadSaved, isSaved, toggleSaved, type SavedCard } from "@/lib/saved";

export type SaveButtonProps = {
  url: string;
  day: DayName;
  source: string;
  detail: string;
  excerpt: string;
  image: string | null;
};

export function SaveButton({ url, day, source, detail, excerpt, image }: SaveButtonProps) {
  // localStorage doesn't exist during prerender; reading it during render
  // would make server and first client render disagree. Start unsaved and
  // correct it after mount.
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSaved(isSaved(loadSaved(), url, detail));
  }, [url, detail]);

  function onClick() {
    const card: SavedCard = { url, day, source, detail, excerpt, image, savedAt: Date.now() };
    const next = toggleSaved(card);
    setSaved(isSaved(next, url, detail));
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={saved ? "Saved" : "Save card"}
      aria-pressed={saved}
      className="text-ink"
    >
      <svg
        viewBox="0 0 24 24"
        className={`h-6 w-6 stroke-current stroke-[1.6] ${saved ? "fill-current" : "fill-none"}`}
      >
        <path d="M6 4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v17l-8-5-8 5V4z" />
      </svg>
    </button>
  );
}
