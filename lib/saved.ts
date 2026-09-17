import { DAY_NAMES, type DayName } from "@/lib/content";

const KEY = "specter.saved.v1";

export type SavedCard = {
  url: string;
  day: DayName;
  source: string;
  detail: string;
  excerpt: string;
  image: string | null;
  savedAt: number;
};

function isDayName(value: unknown): value is DayName {
  return typeof value === "string" && (DAY_NAMES as readonly string[]).includes(value);
}

function isSavedCard(value: unknown): value is SavedCard {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.url === "string" &&
    isDayName(v.day) &&
    typeof v.source === "string" &&
    typeof v.detail === "string" &&
    typeof v.excerpt === "string" &&
    (v.image === null || typeof v.image === "string") &&
    typeof v.savedAt === "number"
  );
}

function isSavedCardList(value: unknown): value is SavedCard[] {
  return Array.isArray(value) && value.every(isSavedCard);
}

function parse(raw: string): SavedCard[] {
  const data: unknown = JSON.parse(raw);
  if (!isSavedCardList(data)) return [];
  return data;
}

export function loadSaved(): SavedCard[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? parse(raw) : [];
  } catch {
    return [];
  }
}

function persist(list: SavedCard[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // Private mode or quota. Saving is a convenience, not the product.
  }
}

/** A card's `url` is the article; several cards in a day can share one
 * article, so `url` alone is not unique. Identity is `url` + `detail`. */
export function isSaved(saved: SavedCard[], url: string, detail: string): boolean {
  return saved.some((c) => c.url === url && c.detail === detail);
}

export function toggleSaved(card: SavedCard): SavedCard[] {
  const current = loadSaved();
  const next = isSaved(current, card.url, card.detail)
    ? current.filter((c) => !(c.url === card.url && c.detail === card.detail))
    : [...current, card];
  persist(next);
  return next;
}

export function clearSaved(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
