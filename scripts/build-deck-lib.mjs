/**
 * Shared cache + fetch helpers for the "Suits" deck pipeline. Split out from
 * scripts/build-deck.mjs so that scripts/build-deck-assemble.mjs can import
 * these without creating a circular module dependency (build-deck.mjs used
 * to import build-deck-assemble.mjs for the "assemble" command, while
 * build-deck-assemble.mjs imported build-deck.mjs for these helpers — with a
 * top-level await in build-deck.mjs's CLI dispatch, that cycle deadlocks
 * Node's ESM loader instead of erroring, which is a much worse failure mode
 * than a slightly longer import list).
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const CACHE_DIR = fileURLToPath(new URL("./.cache/wikipedia/", import.meta.url));
const USER_AGENT = "Specter/0.1 (personal project)";

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** One JSON file per article — cheap to reason about, and a kill mid-run
 * only ever loses whatever the current write hadn't reached yet. */
export function slugify(title) {
  return title.replace(/[^A-Za-z0-9()._-]+/g, "_");
}

function articleCachePath(title) {
  return path.join(CACHE_DIR, `${slugify(title)}.json`);
}

export function loadArticle(title) {
  const file = articleCachePath(title);
  if (!existsSync(file)) return null;
  return JSON.parse(readFileSync(file, "utf8"));
}

export function saveArticle(title, data) {
  mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(articleCachePath(title), JSON.stringify(data, null, 2) + "\n");
}

/** Retry on 429, honouring Retry-After when present, otherwise exponential
 * backoff. Commons has been observed sending Retry-After: 600 (10 minutes)
 * under load — honouring that literally makes bulk verification take hours
 * for a single stubborn URL, so cap what we'll actually sleep for and let
 * the caller decide whether to give up and try again in a later run. */
export async function fetchWithRetry(url, options = {}, attempts = 6, maxBackoffMs = 60000) {
  let res;
  for (let attempt = 0; attempt < attempts; attempt++) {
    res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(15000),
      ...options,
    });
    if (res.status !== 429) return res;
    const retryAfter = Number(res.headers.get("retry-after"));
    const raw = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 2 ** attempt * 1000;
    const delay = Math.min(raw, maxBackoffMs);
    process.stderr.write(`  429, backing off ${delay}ms (server asked for ${raw}ms)\n`);
    await sleep(delay);
  }
  return res;
}

/** Full plain-text extract, one article per request (batching silently
 * returns only one page's text — see the spec). explaintext strips
 * <ref> tags, so citation markers do not normally appear in the result. */
export async function fetchFullText(title) {
  const url =
    "https://en.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext=1&redirects=1&format=json&titles=" +
    encodeURIComponent(title);
  const res = await fetchWithRetry(url);
  if (!res.ok) return { requestedTitle: title, missing: true, status: res.status };
  const data = await res.json();
  const pages = data.query?.pages ?? {};
  const page = Object.values(pages)[0];
  if (!page || page.missing !== undefined) {
    return { requestedTitle: title, missing: true };
  }
  const redirectedFrom = data.query?.redirects?.[0]?.from;
  return {
    requestedTitle: title,
    resolvedTitle: page.title,
    redirectedFrom: redirectedFrom ?? null,
    extract: page.extract ?? "",
    missing: false,
  };
}

/** Every image attached to the page, not just the lead — the owner's
 * complaint was that three cards from one article all reused its single
 * lead photo. */
export async function fetchImageList(title) {
  const url =
    "https://en.wikipedia.org/w/api.php?action=query&prop=images&imlimit=100&format=json&titles=" +
    encodeURIComponent(title);
  const res = await fetchWithRetry(url);
  if (!res.ok) return [];
  const data = await res.json();
  const page = Object.values(data.query?.pages ?? {})[0];
  return (page?.images ?? []).map((i) => i.title); // "File:Foo.jpg"
}

// Interface chrome and boilerplate that turns up as an "image" on many pages
// but is never a photo worth showing.
const BORING_IMAGE_NAME =
  /(commons-logo|wikidata|edit-ltr|ambox|question_book|wiki_letter|symbol_|padlock|folder_hexagon|flag_of|coat_of_arms|crystal)/i;

export function isUsableImageTitle(fileTitle) {
  const name = fileTitle.replace(/^File:/, "");
  if (!/\.(jpe?g|png)$/i.test(name)) return false;
  if (BORING_IMAGE_NAME.test(name)) return false;
  return true;
}

export function commonsFilePath(fileTitle) {
  const name = fileTitle.replace(/^File:/, "").replace(/ /g, "_");
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(name)}?width=760`;
}

/** Confirms a candidate image URL actually resolves to an image before it
 * can ever land in a card — some Commons entries 404 or turn out to be
 * SVG-derived PNGs Commons refuses to rasterize at this width.
 *
 * Tri-state, not boolean: a URL that keeps 429ing is "don't know yet", not
 * "bad" — caching it as false would permanently and wrongly exclude a
 * perfectly good image just because Commons was busy at the moment we
 * asked. Only true/false get cached; null is left untested so a later run
 * (after the rate limit has cooled down) picks it up again. */
export async function verifyImageUrl(url) {
  try {
    let res = await fetchWithRetry(url, { method: "HEAD" }, 3, 8000);
    if (res.status === 429) return null;
    if (res.status === 405 || res.status === 501) {
      res = await fetchWithRetry(url, {}, 3, 8000);
      if (res.status === 429) return null;
      res.body?.cancel?.();
    }
    const contentType = res.headers.get("content-type") ?? "";
    if (!res.ok || !contentType.startsWith("image/")) {
      process.stderr.write(`    not-image: ${url} status=${res.status} ct=${contentType}\n`);
      return false;
    }
    return true;
  } catch (err) {
    process.stderr.write(`    error: ${url} ${err}\n`);
    return null;
  }
}

// Every title referenced anywhere in the seven-day plan (Sunday reuses
// these, fetching nothing new). "Sack coat" is deliberately absent — it
// redirects to "Donkey jacket", which is not part of this deck.
export const ALL_TITLES = [
  // Monday
  "Suit", "Suit jacket", "Waistcoat", "Trousers", "Necktie", "Lapel", "Dress shirt", "Cufflink",
  // Tuesday
  "Savile Row", "Frock coat", "Beau Brummell", "Dandy", "Morning dress", "Black tie", "Court dress",
  // Wednesday
  "Bespoke tailoring", "Tailor", "Pattern (sewing)", "Wool", "Worsted", "Tweed", "Sewing", "Textile",
  // Thursday
  "Made-to-measure", "Ready-to-wear", "Brooks Brothers", "Fast fashion", "Slow fashion",
  // Friday
  "Henry Poole & Co", "Gieves & Hawkes", "Anderson & Sheppard", "H. Huntsman & Sons",
  "Dege & Skinner", "Norton & Sons", "Ede & Ravenscroft", "Kiton", "Brioni (brand)",
  // Saturday
  "Business casual", "Casual Friday", "Athleisure", "Streetwear", "Normcore", "Smart casual",
];

/** Ensures one article's text + raw (filtered, unverified) image candidate
 * list are cached, fetching only whatever isn't there yet. Safe to call
 * every run — each step is a no-op once its flag is set. */
export async function ensureFetched(title) {
  let data = loadArticle(title) ?? { requestedTitle: title };

  if (!data.textFetched) {
    process.stdout.write(`fetching text: ${title}\n`);
    Object.assign(data, await fetchFullText(title), { textFetched: true });
    saveArticle(title, data);
    await sleep(1000);
  } else {
    process.stdout.write(`cached text: ${title}\n`);
  }

  if (data.missing) return data;

  if (!data.imagesFetched) {
    process.stdout.write(`fetching image list: ${title}\n`);
    const raw = await fetchImageList(title);
    data.images = raw.filter(isUsableImageTitle).map(commonsFilePath);
    data.imagesFetched = true;
    saveArticle(title, data);
    await sleep(300);
  }

  return data;
}

/** Strips images that turn up on many different articles' candidate lists —
 * a shared sidebar/template image (e.g. one "history of fashion" nav image
 * appearing on many unrelated pages), not something genuinely from any one
 * article. Using one would either misrepresent the card's source or blow
 * straight past the 25%-of-a-day image-share cap. Pure — reads the already-
 * fetched per-article caches, does not hit the network, and only needs to
 * run once all articles' image lists are populated. */
export function stripSharedTemplateImages(titles) {
  const usage = new Map();
  const byTitle = new Map();
  for (const title of titles) {
    const data = loadArticle(title);
    if (!data || data.missing) continue;
    byTitle.set(title, data);
    for (const u of new Set(data.images ?? [])) usage.set(u, (usage.get(u) ?? 0) + 1);
  }
  const shared = new Set([...usage.entries()].filter(([, n]) => n >= 3).map(([u]) => u));
  if (shared.size > 0) {
    process.stdout.write(`stripping ${shared.size} shared template image(s): ${[...shared].join(", ")}\n`);
  }
  for (const [title, data] of byTitle) {
    const before = data.images.length;
    data.images = (data.images ?? []).filter((u) => !shared.has(u));
    if (data.images.length !== before) saveArticle(title, data);
  }
}

/** Verifies up to `limit` still-untested candidates for one article (a
 * cache already holds true/false for anything checked in a previous run).
 * Saves after every single verification so a kill loses at most one HEAD
 * request's worth of progress. */
export async function verifyArticleImages(title, limit) {
  const data = loadArticle(title);
  if (!data || data.missing) return data;
  data.imageVerification ??= {};
  const candidates = data.images ?? [];
  for (const url of candidates) {
    const verifiedSoFar = candidates.filter((u) => data.imageVerification[u] === true).length;
    if (verifiedSoFar >= limit) break;
    const known = data.imageVerification[url];
    if (known === true || known === false) continue;
    process.stdout.write(`  verifying (${title}): ${url}\n`);
    const result = await verifyImageUrl(url);
    if (result !== null) {
      data.imageVerification[url] = result;
      saveArticle(title, data);
    } else {
      process.stdout.write(`    still rate-limited, leaving untested for a later run\n`);
    }
    await sleep(800);
  }
  return data;
}

export function verifiedImages(data) {
  if (!data || data.missing) return [];
  const verification = data.imageVerification ?? {};
  return (data.images ?? []).filter((u) => verification[u] === true);
}

export const IMAGES_PER_ARTICLE_LIMIT = 15;

export async function cmdFetch() {
  for (const title of ALL_TITLES) {
    await ensureFetched(title);
  }
  stripSharedTemplateImages(ALL_TITLES);
  for (const title of ALL_TITLES) {
    const data = loadArticle(title);
    if (!data || data.missing) continue;
    await verifyArticleImages(title, IMAGES_PER_ARTICLE_LIMIT);
    const fresh = loadArticle(title);
    process.stdout.write(
      `${title}: ${verifiedImages(fresh).length} usable image(s) (of ${fresh.images.length} candidate(s))\n`,
    );
  }
  process.stdout.write("done fetching.\n");
}

/** Splits an extract into sections keyed by heading path, e.g. "History".
 * The lead (before any heading) is keyed "". Strips the heading markers
 * themselves out of the section bodies — an excerpt drawn from inside a
 * section can therefore never contain a stray "== Heading ==" line. */
export function splitSections(extract) {
  const lines = extract.split("\n");
  const sections = [];
  let current = { heading: "", level: 0, text: [] };
  for (const line of lines) {
    const m = line.match(/^(={2,4})\s*(.+?)\s*\1$/);
    if (m) {
      sections.push(current);
      current = { heading: m[2].trim(), level: m[1].length, text: [] };
    } else {
      current.text.push(line);
    }
  }
  sections.push(current);
  return sections.map((s) => ({ ...s, text: s.text.join("\n").trim() })).filter((s) => s.text.length > 0);
}

export function cmdDump(title, sectionQuery) {
  const data = loadArticle(title);
  if (!data) {
    console.error(`no cache entry for "${title}" — run "fetch" first`);
    process.exit(1);
  }
  console.log(`=== ${title} -> ${data.resolvedTitle} ===`);
  const sections = splitSections(data.extract);
  const matches = sectionQuery
    ? sections.filter((s) => s.heading.toLowerCase().includes(sectionQuery.toLowerCase()))
    : sections;
  for (const s of matches) {
    console.log(`\n----- [${s.level}] ${s.heading || "(lead)"} -----`);
    console.log(s.text);
  }
}
