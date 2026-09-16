#!/usr/bin/env node
/**
 * The real content pipeline for the "Suits" deck (see IDEA.md and
 * .superpowers/sdd/2026-09-13-specter-card-viewer/suits-deck-report.md).
 *
 * Unlike scripts/fetch-filler.mjs (a throwaway generator that slices whatever
 * text happens to come back), this script assembles a HAND-CURATED week: the
 * CARDS table in scripts/build-deck-assemble.mjs names, for every card,
 * which article, which section, and which sentence range the excerpt comes
 * from. The only prose this script (or its author) contributes is the
 * `connector` field.
 *
 * The founding rule: every excerpt must be a verbatim substring of the text
 * actually fetched from Wikipedia for that article. build-deck-assemble.mjs
 * enforces that automatically — it asserts the excerpt appears verbatim
 * (whitespace-normalized) in the cached full-text extract for its article,
 * and drops the card (logging why) if it does not. There is no manual
 * override.
 *
 * Split into two phases so a kill from a rate limit loses nothing but the
 * in-flight request:
 *
 *   node scripts/build-deck.mjs fetch      # populate the cache (network, slow, resumable)
 *   node scripts/build-deck.mjs assemble   # build content/suits.json from the cache (no network)
 *   node scripts/build-deck.mjs dump <Title> [section]   # print an article's cached sections
 *
 * `fetch` is idempotent and safe to re-run: every article's text, image
 * list, and image-verification results are cached in their own file under
 * scripts/.cache/wikipedia/<slug>.json (gitignored) and only ever fetched
 * once. Re-running after a kill resumes from whichever step it stopped at.
 *
 * This file is deliberately a thin CLI shell — the actual work lives in
 * scripts/build-deck-lib.mjs (cache + fetch helpers, shared with the
 * assemble phase) and scripts/build-deck-assemble.mjs (the CARDS table and
 * assembly logic). Keeping fetch/dump helpers out of this file and out of
 * build-deck-assemble.mjs's import chain avoids a circular import between
 * the two — which, combined with the top-level await below, previously
 * deadlocked Node's ESM loader instead of erroring.
 */

import path from "node:path";
import { fileURLToPath } from "node:url";
import { cmdFetch, cmdDump } from "./build-deck-lib.mjs";

async function cmdAssemble() {
  const { assemble } = await import("./build-deck-assemble.mjs");
  await assemble();
}

// Only run the CLI dispatch when this file is executed directly — it is
// also imported as a plain module by tests, which must not trigger it.
// Compared as filesystem paths (not raw URL strings) because a path
// containing spaces makes import.meta.url percent-encoded while
// process.argv[1] is not.
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const [, , cmd, ...rest] = process.argv;
  try {
    if (cmd === "fetch") {
      await cmdFetch();
    } else if (cmd === "assemble" || cmd === "build") {
      await cmdAssemble();
    } else if (cmd === "dump") {
      cmdDump(rest[0], rest[1]);
    } else {
      console.error("usage: node scripts/build-deck.mjs <fetch|assemble|dump <Title> [section]>");
      process.exit(1);
    }
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
