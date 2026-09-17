"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DAY_LABELS, dayIndex, type DayName, type DayPreview } from "@/lib/content";
import { currentDayName } from "@/lib/schedule";
import { loadProgress } from "@/lib/progress";
import { loadSaved } from "@/lib/saved";
import { DayCircles } from "@/components/DayCircles";
import { SourceAvatar } from "@/components/SourceAvatar";

export function Today({ topic, previews }: { topic: string; previews: DayPreview[] }) {
  const [today, setToday] = useState<DayName>("monday");
  const [completed, setCompleted] = useState<DayName[]>([]);
  const [dev, setDev] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setToday(currentDayName(new Date()));
    setCompleted(loadProgress().completed);
    setDev(new URLSearchParams(window.location.search).get("dev") === "1");
    setSavedCount(loadSaved().length);
    setMounted(true);
  }, []);

  const preview = previews.find((p) => p.day === today);
  const isComplete = completed.includes(today);

  return (
    <main className="min-h-dvh bg-bg pt-[env(safe-area-inset-top)]">
      <header className="px-4 pb-1 pt-4">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">{topic}</h1>
          <span className="text-xs text-ink2">
            {DAY_LABELS[today]} &middot; {dayIndex(today) + 1} of 7
          </span>
        </div>
        {savedCount > 0 ? (
          <p className="mt-1 text-right">
            <Link href="/saved" className="text-xs text-ink2">
              Saved ({savedCount})
            </Link>
          </p>
        ) : null}
      </header>

      <DayCircles today={today} completed={completed} dev={dev} />

      <h2 className="px-4 pb-2 pt-3 text-sm font-semibold text-ink">
        Today{mounted && preview ? ` · ${preview.slot}` : ""}
      </h2>

      {mounted && preview ? (
        <TodayPreview day={today} preview={preview} complete={isComplete} />
      ) : (
        <TodayPreviewPlaceholder />
      )}
    </main>
  );
}

function TodayPreview({
  day,
  preview,
  complete,
}: {
  day: DayName;
  preview: DayPreview;
  complete: boolean;
}) {
  const cta = complete ? "Replay today" : "Tap to begin";

  return (
    <Link href={`/day/${day}`} className="block px-4 pb-6">
      <article className="overflow-hidden rounded-2xl border border-divider bg-surface">
        {preview.card ? (
          <>
            <header className="flex items-center gap-2.5 px-3.5 py-2.5">
              <SourceAvatar source={preview.card.source} domain={preview.card.domain} />
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold leading-tight">
                  {preview.card.source}
                </div>
                <div className="mt-px truncate text-xs text-ink2">{preview.card.detail}</div>
              </div>
            </header>

            {preview.card.image ? (
              <div className="aspect-square bg-bg">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={preview.card.image}
                  alt={preview.card.detail}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              </div>
            ) : null}

            <p className="line-clamp-3 px-3.5 pb-3.5 pt-2.5 text-sm leading-[1.45]">
              {preview.card.excerpt}
            </p>
          </>
        ) : (
          <p className="px-3.5 py-3.5 text-sm leading-[1.45] text-ink2">
            {preview.cardCount} cards waiting.
          </p>
        )}
      </article>
      <p className="pt-3 text-center text-xs font-semibold text-accent">{cta}</p>
    </Link>
  );
}

// Same box heights as TodayPreview's real content, so mounting doesn't
// visibly shift the layout once the actual day and its preview are known.
function TodayPreviewPlaceholder() {
  return (
    <div className="px-4 pb-6" aria-hidden="true">
      <div className="overflow-hidden rounded-2xl border border-divider bg-surface">
        <div className="flex items-center gap-2.5 px-3.5 py-2.5">
          <span className="h-8 w-8 flex-none rounded-full bg-divider" />
          <div className="min-w-0 flex-1">
            <div className="h-3.5 w-24 rounded bg-divider" />
            <div className="mt-1.5 h-3 w-32 rounded bg-divider" />
          </div>
        </div>
        <div className="aspect-square bg-divider" />
        <div className="space-y-1.5 px-3.5 pb-3.5 pt-2.5">
          <div className="h-3 w-full rounded bg-divider" />
          <div className="h-3 w-5/6 rounded bg-divider" />
        </div>
      </div>
      <p className="pt-3 text-center">
        <span className="inline-block h-3 w-20 rounded bg-divider" />
      </p>
    </div>
  );
}
