import { getDeck } from "@/lib/deck";
import { Today } from "@/components/Today";

export default function Page() {
  const deck = getDeck();
  return <Today topic={deck.topic} week={deck.week} />;
}
