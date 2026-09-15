"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DAY_LABELS } from "@/lib/content";
import { loadSaved, type SavedCard } from "@/lib/saved";
import { SourceAvatar } from "@/components/SourceAvatar";

function domainOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

export default function SavedPage() {
  const [saved, setSaved] = useState<SavedCard[]>([]);

  useEffect(() => {
    setSaved(loadSaved());
  }, []);

  const sorted = [...saved].sort((a, b) => b.savedAt - a.savedAt);

  return (
    <main className="min-h-dvh bg-bg pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]">
      <header className="flex items-center gap-2 px-4 pb-2 pt-4">
        <Link href="/" aria-label="Back to Today" className="-ml-1 p-1 text-ink">
          <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-[2]">
            <path d="M15 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <h1 className="text-base font-semibold tracking-tight">Saved</h1>
      </header>

      {sorted.length === 0 ? (
        <p className="px-4 py-8 text-sm text-ink2">Saving a card keeps it here.</p>
      ) : (
        <ul>
          {sorted.map((card) => (
            <li key={`${card.url}-${card.detail}`} className="border-b border-divider px-3.5 py-3">
              <a
                href={card.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex gap-2.5"
              >
                <SourceAvatar source={card.source} domain={domainOf(card.url)} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-semibold leading-tight text-ink">
                      {card.source}
                    </span>
                    <span className="flex-none text-xs text-ink2">{DAY_LABELS[card.day]}</span>
                  </div>
                  <p className="mt-0.5 text-sm leading-[1.45] text-ink">{card.excerpt}</p>
                  <p className="mt-1 truncate text-xs leading-[1.45] text-ink2">{card.detail}</p>
                </div>
              </a>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
