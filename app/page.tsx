"use client";

import { useEffect, useState } from "react";
import { getDeck, type DayName } from "@/lib/content";
import { currentDayName } from "@/lib/schedule";
import { loadProgress } from "@/lib/progress";
import { DayCircles } from "@/components/DayCircles";

export default function Page() {
  const deck = getDeck();

  const [today, setToday] = useState<DayName>("monday");
  const [completed, setCompleted] = useState<DayName[]>([]);
  const [dev, setDev] = useState(false);

  useEffect(() => {
    setToday(currentDayName(new Date()));
    setCompleted(loadProgress().completed);
    setDev(new URLSearchParams(window.location.search).get("dev") === "1");
  }, []);

  return (
    <main className="min-h-dvh bg-bg pt-[env(safe-area-inset-top)]">
      <header className="px-4 pb-1 pt-4">
        <h1 className="text-2xl font-semibold tracking-tight">{deck.topic}</h1>
        <p className="mt-0.5 text-xs text-ink2">Week {deck.week}</p>
      </header>

      <DayCircles today={today} completed={completed} dev={dev} />
    </main>
  );
}
