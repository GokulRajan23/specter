import { DAY_LABELS, DAY_NAMES, dayIndex, type DayName } from "@/lib/content";

const FULL: Record<DayName, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

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
      <h2 className="mb-1.5 text-base font-semibold">That&rsquo;s {FULL[day]}.</h2>
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
    </section>
  );
}
