import Link from "next/link";
import { DAY_LABELS, DAY_NAMES, type DayName } from "@/lib/content";
import { circleState, isOpenable } from "@/lib/schedule";

const RING: Record<string, string> = {
  done: "bg-ink text-bg border-transparent",
  today: "bg-surface text-accent border-accent",
  past: "bg-surface text-ink2 border-transparent",
  locked: "bg-surface text-ink2 border-transparent opacity-35",
};

export function DayCircles({
  today,
  completed,
  dev,
}: {
  today: DayName;
  completed: DayName[];
  dev: boolean;
}) {
  return (
    <div className="flex justify-between gap-2 px-4 py-3">
      {DAY_NAMES.map((day) => {
        const state = circleState(day, today, completed, dev);
        const open = isOpenable(day, today, dev);
        const label = `${day}${state === "done" ? ", done" : ""}`;

        const circle = (
          <span
            data-testid="day-circle"
            className={`grid h-10 w-10 place-items-center rounded-full border-[1.5px] text-xs font-semibold ${RING[state]}`}
          >
            {DAY_LABELS[day].charAt(0)}
          </span>
        );

        return (
          <span key={day} className="grid justify-items-center gap-1.5">
            {open ? (
              <Link href={`/day/${day}`} aria-label={label}>
                {circle}
              </Link>
            ) : (
              circle
            )}
            <span className="text-[9.5px] tracking-wide text-ink2">{DAY_LABELS[day]}</span>
          </span>
        );
      })}
    </div>
  );
}
