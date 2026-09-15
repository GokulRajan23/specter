import type { Card, DayName } from "@/lib/content";
import { SourceAvatar } from "@/components/SourceAvatar";
import { Carousel } from "@/components/Carousel";
import { SaveButton } from "@/components/SaveButton";

export function Post({ card, day }: { card: Card; day: DayName }) {
  return (
    <article className="no-callout border-b border-divider pb-2">
      <header className="flex items-center gap-2.5 px-3.5 py-2.5">
        <SourceAvatar source={card.source} domain={card.domain} />
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold leading-tight">{card.source}</div>
          <div className="mt-px truncate text-xs text-ink2">{card.detail}</div>
        </div>
      </header>

      <Carousel media={card.media} alt={card.detail} />

      <div className="flex items-center gap-4 px-3.5 pb-1 pt-2.5">
        <a
          href={card.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="View source"
          className="text-ink"
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-current stroke-[1.6]">
            <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" />
            <path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" />
          </svg>
        </a>
        <SaveButton
          url={card.url}
          day={day}
          source={card.source}
          detail={card.detail}
          excerpt={card.excerpt}
          image={card.media[0] ?? null}
        />
      </div>

      <p className="px-3.5 pt-0.5 text-sm leading-[1.45]">{card.excerpt}</p>
      <p className="px-3.5 pb-3 pt-1.5 text-xs leading-[1.45] text-ink2">{card.connector}</p>
    </article>
  );
}
