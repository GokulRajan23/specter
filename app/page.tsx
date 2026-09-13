"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { getDeck, type DayName } from "@/lib/content";
import { currentDayName } from "@/lib/schedule";
import { loadProgress } from "@/lib/progress";
import { DayCircles } from "@/components/DayCircles";

function Today() {
  const deck = getDeck();
  const params = useSearchParams();
  const dev = params.get("dev") === "1";

  const [today, setToday] = useState<DayName>("monday");
  const [completed, setCompleted] = useState<DayName[]>([]);

  useEffect(() => {
    setToday(currentDayName(new Date()));
    setCompleted(loadProgress().completed);
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

export default function Page() {
  return (
    <Suspense>
      <Today />
    </Suspense>
  );
}
