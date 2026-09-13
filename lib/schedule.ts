import { DAY_NAMES, dayIndex, type DayName } from "@/lib/content";

/** JS getDay() is Sunday-first (0=Sun). The product week is Monday-first. */
export function currentDayName(date: Date): DayName {
  const js = date.getDay();
  const mondayFirst = (js + 6) % 7;
  return DAY_NAMES[mondayFirst];
}

export function isOpenable(day: DayName, today: DayName, dev: boolean): boolean {
  if (dev) return true;
  return dayIndex(day) <= dayIndex(today);
}

export type CircleState = "done" | "today" | "past" | "locked";

export function circleState(
  day: DayName,
  today: DayName,
  completed: DayName[],
  dev: boolean,
): CircleState {
  if (completed.includes(day)) return "done";
  if (day === today) return "today";
  return isOpenable(day, today, dev) ? "past" : "locked";
}
