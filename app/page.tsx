import { getDeck, getDeckPreviews } from "@/lib/deck";
import { Today } from "@/components/Today";

export default function Page() {
  const deck = getDeck();
  const previews = getDeckPreviews(deck);
  return <Today topic={deck.topic} previews={previews} />;
}
