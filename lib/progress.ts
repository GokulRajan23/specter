import { DAY_NAMES, type DayName } from "@/lib/content";

const KEY = "specter.progress.v1";

export type Progress = {
  completed: DayName[];
  lastCard: Partial<Record<DayName, number>>;
};

export const EMPTY_PROGRESS: Progress = { completed: [], lastCard: {} };

function isDayNameList(value: unknown): value is DayName[] {
  return (
    Array.isArray(value) &&
    value.every((v) => typeof v === "string" && (DAY_NAMES as readonly string[]).includes(v))
  );
}

function parse(raw: string): Progress {
  const data: unknown = JSON.parse(raw);
  if (typeof data !== "object" || data === null) return EMPTY_PROGRESS;

  const { completed, lastCard } = data as Record<string, unknown>;
  if (!isDayNameList(completed)) return EMPTY_PROGRESS;
  if (typeof lastCard !== "object" || lastCard === null) return EMPTY_PROGRESS;

  const cleaned: Partial<Record<DayName, number>> = {};
  for (const [k, v] of Object.entries(lastCard)) {
    if ((DAY_NAMES as readonly string[]).includes(k) && typeof v === "number") {
      cleaned[k as DayName] = v;
    }
  }

  return { completed, lastCard: cleaned };
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

export function setLastCard(day: DayName, index: number): Progress {
  const p = loadProgress();
  const current = p.lastCard[day] ?? -1;
  if (index <= current) return p;
  const next: Progress = { ...p, lastCard: { ...p.lastCard, [day]: index } };
  saveProgress(next);
  return next;
}

export function isComplete(p: Progress, day: DayName): boolean {
  return p.completed.includes(day);
}
