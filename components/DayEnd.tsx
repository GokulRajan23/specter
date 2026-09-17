import Link from "next/link";
import { DAY_LABELS, DAY_NAMES, dayIndex, type DayName } from "@/lib/content";

/** DayName values are already the full name, just lowercase ("monday") — no
 * need for a second hardcoded Monday/Tuesday/... map alongside DAY_LABELS. */
function fullDayName(day: DayName): string {
  return day.charAt(0).toUpperCase() + day.slice(1);
}

export function DayEnd({
  day,
  cardCount,
  slot,
}: {
  day: DayName;
  cardCount: number;
  slot: string;
}) {
  const next = DAY_NAMES[dayIndex(day) + 1];

  return (
    <section className="grid place-items-center px-8 pb-24 pt-16 text-center">
      <span className="mb-4 grid h-12 w-12 place-items-center rounded-full bg-accent">
        <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-white stroke-[2.4]">
          <path d="M4 12.5l5.5 5.5L20 7" />
        </svg>
      </span>
      <h2 className="mb-1.5 text-base font-semibold">That&rsquo;s {fullDayName(day)}.</h2>
      <p className="text-xs leading-relaxed text-ink2">
        {cardCount} cards &middot; {slot}.
        {next ? (
          <>
            <br />
            {DAY_LABELS[next]} unlocks tomorrow.
          </>
        ) : (
          <>
            <br />
            That&rsquo;s the week.
          </>
        )}
      </p>
      <Link href="/" className="mt-5 text-xs font-semibold text-accent">
        Back to Today
      </Link>
    </section>
  );
}
