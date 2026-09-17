import { DAY_NAMES, type DayName } from "@/lib/content";

const KEY = "specter.progress.v1";

export type Progress = {
  completed: DayName[];
};

export const EMPTY_PROGRESS: Progress = { completed: [] };

function isDayNameList(value: unknown): value is DayName[] {
  return (
    Array.isArray(value) &&
    value.every((v) => typeof v === "string" && (DAY_NAMES as readonly string[]).includes(v))
  );
}

function parse(raw: string): Progress {
  const data: unknown = JSON.parse(raw);
  if (typeof data !== "object" || data === null) return EMPTY_PROGRESS;

  const { completed } = data as Record<string, unknown>;
  if (!isDayNameList(completed)) return EMPTY_PROGRESS;

  return { completed };
}

export function loadProgress(): Progress {
  if (typeof window === "undefined") return EMPTY_PROGRESS;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? parse(raw) : EMPTY_PROGRESS;
  } catch {
    return EMPTY_PROGRESS;
  }
}

export function saveProgress(p: Progress): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // Private mode or quota. Progress is a convenience, not the product.
  }
}

export function markComplete(day: DayName): Progress {
  const p = loadProgress();
  const next: Progress = p.completed.includes(day)
    ? p
    : { ...p, completed: [...p.completed, day] };
  saveProgress(next);
  return next;
}

