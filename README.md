# Specter

**Scroll something worth it.**

## Why

Doomscrolling Instagram costs you twenty minutes a day and leaves you with nothing.
The scrolling isn't the problem. The empty content is. So Specter keeps the habit and
replaces what's in it: the same thumb, the same few minutes, except you come away
knowing something.

One topic a week, taught properly, in a feed that ends.

## How it works

Each week has a topic and a fixed seven-day arc: the map, origins, mechanics, the
arguments, primary sources, the frontier, and a Sunday that only asks you to recall.
Each day is a finite deck of roughly thirty cards, nine to eleven minutes, and then it
stops. There is no infinite scroll and no For You page, because that's the thing it
replaces.

**Every card is a verbatim excerpt from a real source, with a link.** Nothing is written
by a model. The deck builder checks each excerpt against the fetched source text
character by character and drops any card that fails, so a fabricated sentence never
reaches the app.

## This build

Phone-first PWA carrying a real curated week on **Suits**: 244 cards across seven days,
31–38 per day, drawn from 43 Wikipedia articles. See
`docs/superpowers/specs/2026-09-13-burrow-card-viewer-design.md` for the design and
`IDEA.md` for the product thinking.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Local dev server |
| `npm test` | Unit and component tests |
| `npm run build` | Production build |
| `npm run build-deck` | Rebuild `content/suits.json`: `fetch` then `assemble` |
| `npm run icons` | Redraw the app icons from `scripts/make-icons.py` |

`npm run filler` still exists. It's the throwaway generator from before the curated deck,
kept only for scaffolding a new topic quickly.

### Rebuilding a week

The deck builder runs in two phases so an interrupted run costs nothing. `fetch` caches
each article under `scripts/.cache/wikipedia/` and is safe to re-run; `assemble` builds
the deck from that cache without touching the network. `lib/variety.ts` holds the
deck-quality rules (reading time, image spread, register alternation), and the test suite
enforces them, so a bad deck fails `npm test` rather than shipping.

## Installing on an iPhone

1. Deploy: `npx vercel --prod`
2. Open the deployment URL in **Safari**. Only Safari can install to the home screen.
3. Share → Add to Home Screen
4. Open from the icon. There should be no address bar.

`?dev=1` on the Today screen unlocks all seven days for testing.

## Not in this build

Library, Queue, Reels, Supabase, the automated Sunday cron, multi-publisher sourcing,
search, streaks, accounts, offline caching.
