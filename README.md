# Specter

**Scroll something worth it.**

One topic a week, in real depth. A feed that ends.

Phone-first PWA. Build-order step 1: the card viewer with filler content.
See `docs/superpowers/specs/2026-09-13-burrow-card-viewer-design.md` for the design,
and `IDEA.md` for the product.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Local dev server |
| `npm test` | Unit and component tests |
| `npm run build` | Production build |
| `npm run filler` | Regenerate `content/suits.json` from Wikipedia |
| `npm run icons` | Redraw the app icons from `scripts/make-icons.py` |

## Filler content

`content/suits.json` is a 154-card deck across the week's seven days (20-24 cards
per day), drawn from 7-8 Wikipedia articles per day. It stands in for the real
content pipeline, which does not exist yet.

## Installing on an iPhone

1. Deploy: `npx vercel --prod`
2. Open the deployment URL in **Safari** (not Chrome — only Safari can install to the home screen)
3. Share → Add to Home Screen
4. Open from the icon. There should be no address bar.

`?dev=1` on the Today screen unlocks all seven days for testing.

## Not in this build

Library, Queue, Reels, Supabase, the content pipeline, the verbatim verifier,
the Sunday cron, search, streaks, accounts, offline caching.
