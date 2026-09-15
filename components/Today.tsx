"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { DayName } from "@/lib/content";
import { currentDayName } from "@/lib/schedule";
import { loadProgress } from "@/lib/progress";
import { loadSaved } from "@/lib/saved";
import { DayCircles } from "@/components/DayCircles";

export function Today({ topic, week }: { topic: string; week: number }) {
  const [today, setToday] = useState<DayName>("monday");
  const [completed, setCompleted] = useState<DayName[]>([]);
  const [dev, setDev] = useState(false);
  const [savedCount, setSavedCount] = useState(0);

  useEffect(() => {
    setToday(currentDayName(new Date()));
    setCompleted(loadProgress().completed);
    setDev(new URLSearchParams(window.location.search).get("dev") === "1");
    setSavedCount(loadSaved().length);
  }, []);

  return (
    <main className="min-h-dvh bg-bg pt-[env(safe-area-inset-top)]">
      <header className="px-4 pb-1 pt-4">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">{topic}</h1>
          {savedCount > 0 ? (
            <Link href="/saved" className="text-xs text-ink2">
              Saved ({savedCount})
            </Link>
          ) : null}
        </div>
        <p className="mt-0.5 text-xs text-ink2">Week {week}</p>
      </header>

      <DayCircles today={today} completed={completed} dev={dev} />
    </main>
  );
}
