"use client";

import { useRef, useState } from "react";

export function activeIndex(scrollLeft: number, clientWidth: number, count: number): number {
  if (clientWidth <= 0) return 0;
  const raw = Math.round(scrollLeft / clientWidth);
  return Math.min(Math.max(raw, 0), count - 1);
}

export function Carousel({ media, alt }: { media: string[]; alt: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const multi = media.length > 1;

  function onScroll() {
    const el = ref.current;
    if (!el) return;
    setIndex(activeIndex(el.scrollLeft, el.clientWidth, media.length));
  }

  return (
    <div className="relative aspect-square bg-surface">
      <div
        ref={ref}
        onScroll={onScroll}
        className="no-bars flex h-full snap-x snap-mandatory overflow-x-auto"
      >
        {media.map((src) => (
          <figure key={src} className="m-0 h-full w-full flex-none snap-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={alt} loading="lazy" className="h-full w-full object-cover" />
          </figure>
        ))}
      </div>

      {multi && (
        <>
          <span className="absolute right-3 top-3 rounded-full bg-black/60 px-2 py-0.5 text-xs font-semibold text-white">
            {index + 1}/{media.length}
          </span>
          <div
            data-testid="dots"
            className="pointer-events-none absolute inset-x-0 top-3 flex justify-center gap-1"
          >
            {media.map((src, i) => (
              <i
                key={src}
                className={`h-1.5 w-1.5 rounded-full bg-white transition-opacity ${
                  i === index ? "opacity-100" : "opacity-30"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
