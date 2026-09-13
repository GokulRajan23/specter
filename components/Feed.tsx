"use client";

import { useEffect, useRef, useState } from "react";
import { DAY_LABELS, dayIndex, type Day } from "@/lib/content";
import { Post } from "@/components/Post";
import { DayEnd } from "@/components/DayEnd";
import { markComplete, setLastCard } from "@/lib/progress";

const FLOOR = 0.06;

export function scrollProgress(
  scrollTop: number,
  scrollHeight: number,
  clientHeight: number,
): number {
  const max = scrollHeight - clientHeight;
  if (max <= 0) return FLOOR;
  const ratio = scrollTop / max;
  return Math.min(Math.max(ratio, FLOOR), 1);
}

export function Feed({ day, topic }: { day: Day; topic: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(FLOOR);
  // Track what this instance has already written so we don't re-read/re-parse
  // localStorage (via lib/progress.ts) on every one of ~60 scroll events/sec —
  // only the write is idempotent inside lib/progress.ts, not the read+parse.
  const lastCardRef = useRef(-1);
  const completedRef = useRef(false);

  function onScroll() {
    const el = ref.current;
    if (!el) return;

    setProgress(scrollProgress(el.scrollTop, el.scrollHeight, el.clientHeight));

    // Rough card position: good enough to resume, and free of per-post refs.
    const perCard = el.scrollHeight / Math.max(day.cards.length, 1);
    const index = Math.floor(el.scrollTop / perCard);
    if (index !== lastCardRef.current) {
      lastCardRef.current = index;
      setLastCard(day.day, index);
    }

    if (!completedRef.current && el.scrollTop + el.clientHeight >= el.scrollHeight - 4) {
      completedRef.current = true;
      markComplete(day.day);
    }
  }

  useEffect(() => {
    // A new day resets what this instance has already written.
    lastCardRef.current = -1;
    completedRef.current = false;

    // A day whose feed is shorter than the screen can never be scrolled to the end.
    const el = ref.current;
    if (el && el.scrollHeight <= el.clientHeight) {
      completedRef.current = true;
      markComplete(day.day);
    }
  }, [day.day]);

  return (
    <div className="flex h-dvh flex-col bg-bg">
      <header className="flex-none px-4 pb-2.5 pt-[calc(env(safe-area-inset-top)+0.5rem)]">
        <div className="mb-2 flex items-baseline justify-between">
          <span className="text-base font-semibold tracking-tight">{topic}</span>
          <span className="text-xs text-ink2">
            {DAY_LABELS[day.day]} &middot; {dayIndex(day.day) + 1} of 7
          </span>
        </div>
        <div className="h-[2.5px] overflow-hidden rounded-full bg-divider">
          <i
            data-testid="progress"
            className="block h-full rounded-full bg-accent transition-[width] duration-100"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </header>

      <div ref={ref} onScroll={onScroll} className="no-bars flex-1 overflow-y-auto">
        {day.cards.map((card, i) => (
          <Post key={`${card.url}-${i}`} card={card} />
        ))}
        <DayEnd day={day.day} cardCount={day.cards.length} slot={day.slot} />
      </div>
    </div>
  );
}
