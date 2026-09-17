export const DAY_NAMES = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

export type DayName = (typeof DAY_NAMES)[number];

export const DAY_LABELS: Record<DayName, string> = {
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
  saturday: "Sat",
  sunday: "Sun",
};

export type Card = {
  source: string;
  domain: string;
  detail: string;
  url: string;
  /** One entry renders a plain post; more than one renders a carousel. */
  media: string[];
  excerpt: string;
  connector: string;
};

export type Day = {
  day: DayName;
  slot: string;
  cards: Card[];
};

export type Deck = {
  topic: string;
  week: number;
  days: Day[];
};

/** The bit of a day's first image-bearing card the Today screen needs to
 * render a live preview. Never the whole Card — no connector, no url, and
 * the excerpt is pre-truncated — so this stays small enough to pass as a
 * prop into the client Today component. */
export type DayPreviewCard = {
  source: string;
  domain: string;
  detail: string;
  image: string | null;
  excerpt: string;
};

export type DayPreview = {
  day: DayName;
  slot: string;
  cardCount: number;
  card: DayPreviewCard | null;
};

export function dayIndex(day: DayName): number {
  return DAY_NAMES.indexOf(day);
}

export function isDayName(value: string): value is DayName {
  return (DAY_NAMES as readonly string[]).includes(value);
}
