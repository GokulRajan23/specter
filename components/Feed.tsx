"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import type { Day } from "@/lib/content";
import { Post } from "@/components/Post";
import { DayEnd } from "@/components/DayEnd";
import { markComplete } from "@/lib/progress";

export function Feed({ day }: { day: Day }) {
  const ref = useRef<HTMLDivElement>(null);
  const dayEndRef = useRef<HTMLDivElement>(null);
  const completedRef = useRef(false);

  function complete() {
    if (completedRef.current) return;
    completedRef.current = true;
    markComplete(day.day);
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
    <div className="relative h-dvh bg-bg">
      {/* No header any more, so nothing else provides an exit in standalone
       * display mode — the iOS left-edge swipe sits under the horizontally
       * scrolling carousels. This floats above the feed instead. */}
      <Link
        href="/"
        aria-label="Back to Today"
        className="fixed left-3 top-[calc(env(safe-area-inset-top)+0.5rem)] z-10 grid h-8 w-8 place-items-center rounded-full bg-bg/60 text-ink backdrop-blur-md"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-[2]">
          <path d="M15 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Link>

      <div
        ref={ref}
        className="no-bars h-full overflow-y-auto overscroll-none pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
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
