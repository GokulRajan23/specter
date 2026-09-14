import { notFound } from "next/navigation";
import { DAY_NAMES, isDayName } from "@/lib/content";
import { getDeck, getDay } from "@/lib/deck";
import { Feed } from "@/components/Feed";

export function generateStaticParams() {
  return DAY_NAMES.map((day) => ({ day }));
}

export default async function DayPage({ params }: { params: Promise<{ day: string }> }) {
  const { day } = await params;
  if (!isDayName(day)) notFound();

  const deck = getDeck();
  const found = getDay(deck, day);
  if (!found) notFound();

  return <Feed day={found} topic={deck.topic} />;
}
