"use client";

import { useState } from "react";

const KNOWN: Record<string, string> = {
  "en.wikipedia.org":
    "https://commons.wikimedia.org/wiki/Special:FilePath/Wikipedia-logo-v2.svg?width=128",
};

export function avatarSrc(domain: string): string {
  return KNOWN[domain] ?? `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
}

export function monogram(source: string): string {
  return source.trim().charAt(0).toUpperCase() || "?";
}

export function SourceAvatar({ source, domain }: { source: string; domain: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span className="grid h-8 w-8 flex-none place-items-center rounded-full bg-ink2 text-[13px] font-bold text-white">
        {monogram(source)}
      </span>
    );
  }

  return (
    <span className="grid h-8 w-8 flex-none place-items-center overflow-hidden rounded-full border border-edge bg-white">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={avatarSrc(domain)}
        alt={source}
        className="h-full w-full object-contain p-1"
        onError={() => setFailed(true)}
      />
    </span>
  );
}
