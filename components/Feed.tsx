"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { DAY_LABELS, dayIndex, type Day } from "@/lib/content";
import { Post } from "@/components/Post";
import { DayEnd } from "@/components/DayEnd";
import { markComplete } from "@/lib/progress";

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
  const dayEndRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(FLOOR);
  const completedRef = useRef(false);

  function complete() {
    if (completedRef.current) return;
    completedRef.current = true;
    markComplete(day.day);
  }

  function onScroll() {
    const el = ref.current;
    if (!el) return;

    setProgress(scrollProgress(el.scrollTop, el.scrollHeight, el.clientHeight));
  }

  useEffect(() => {
    // A new day resets what this instance has already written.
    completedRef.current = false;

    // A day whose feed is shorter than the screen can never be scrolled to the end.
    const el = ref.current;
    if (el && el.scrollHeight <= el.clientHeight) {
      complete();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day.day]);

  useEffect(() => {
    const root = ref.current;
    const target = dayEndRef.current;
    if (!root || !target || typeof IntersectionObserver === "undefined") return;

    // Completion is driven by the DayEnd card actually becoming visible, not by a
    // scroll-position threshold — the scroller's bottom padding (safe-area inset
    // plus the card's own padding) means "within N px of scrollHeight" can be
    // reached without the card ever entering the viewport.
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          complete();
        }
      },
      { root, threshold: 0 },
    );
    observer.observe(target);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day.day]);

  return (
    <div className="flex h-dvh flex-col bg-bg">
      <header className="flex-none px-4 pb-2.5 pt-[calc(env(safe-area-inset-top)+0.5rem)]">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/" aria-label="Back to Today" className="-ml-1 p-1 text-ink">
              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-[2]">
                <path d="M15 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
            <span className="text-base font-semibold tracking-tight">{topic}</span>
          </div>
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

      <div
        ref={ref}
        onScroll={onScroll}
        className="no-bars flex-1 overflow-y-auto overscroll-none pb-[env(safe-area-inset-bottom)]"
      >
        {day.cards.map((card, i) => (
          <Post key={`${card.url}-${i}`} card={card} day={day.day} />
        ))}
        <div ref={dayEndRef}>
          <DayEnd day={day.day} cardCount={day.cards.length} slot={day.slot} />
        </div>
      </div>
    </div>
  );
}
