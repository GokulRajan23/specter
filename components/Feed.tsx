"use client";

import { useEffect, useRef } from "react";
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
      {/* No back control here on purpose: the iOS left-edge swipe already
       * exits the feed on device, and a floating chevron over the first card
       * competed with its source avatar. The day-end card still links home
       * for anyone who reaches the bottom. */}
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
