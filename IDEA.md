# Social Media (working name)

A phone-first, Instagram-style scroll feed that teaches one topic per week in real depth.
Discussed 2026-09-10. To be expanded the weekend of 2026-09-12/13.

## The idea

Instead of doomscrolling, spend the same scroll time going down one rabbit hole per week.
Each day you swipe through a finite set of full-screen cards about this week's topic. By Sunday you
know the topic well enough to hold a real conversation about it. Over a year that is roughly fifty
topics you actually know, not fifty things you have heard of.

The scroll habit is not the problem. The empty content is. So copy the habit loop from Instagram
(full-bleed cards, swipe physics, home-screen icon) and replace the algorithm with a syllabus.

Example week: suits. By Sunday you know why a half-canvassed jacket drapes differently, what a
Neapolitan shoulder is, and why someone pays for Savile Row.

## Decisions made

- **Solo use only.** No sharing, no accounts for others. Single-user data model.
- **No generated facts.** Every card is a verbatim excerpt from a real source with a link.
  The model only finds, orders, excerpts, and writes a one-line "why this card is next" connector.
  The connector is about the arc, not the topic, so it cannot hallucinate anything you would learn as true.
- **User picks topics**, backed by a queue. Fill the queue whenever you notice a gap in a
  conversation. The queue should nudge toward alternating domains (a craft, a science, a history,
  a place, an art) so breadth actually happens.
- **Topics are often crafts and culture**, not only academic subjects: suits, wine, coffee,
  watches, cycling, cheese. The arc must work for those.
- **Aesthetics come first.** If it is not as pleasing as Instagram it will not get opened.
  Build the card viewer before the content pipeline.

## The 7-day depth curve

Fixed arc, not adaptive. Adaptive would need generated quiz questions, which is the content we
do not want. Same seven slots for every topic; the model only picks which sources fill each slot.

| Day | Slot | Suits example | Typical sources |
|-----|------|---------------|-----------------|
| Mon | The map. Vocabulary, subtopics, what it is | Anatomy of a suit, the words | Wikipedia lead sections, one good explainer |
| Tue | Origins. How it came to be | Where the suit came from | History sections, timelines |
| Wed | Mechanics. Core ideas explained properly | How a suit is actually made | Long-form articles, textbook chapters, lecture transcripts |
| Thu | The arguments. Where experts disagree, key people | British vs Italian vs American | Debates, critiques, rival schools |
| Fri | Primary sources. The makers in their own words | Tailors, houses, their own writing | Original papers, speeches, source texts |
| Sat | The frontier. Where it stands now | What is happening in menswear now | Recent articles, web search |
| Sun | Recall. No new content | Dinner-table prompts | The week's own cards |

Sunday recall is framed as conversation, not facts: "Someone asks why bespoke costs so much.
What do you say?" Tap to reveal the two or three cards from the week that answer it.

Shortcut: Wikipedia's structure already is a depth curve. Lead = Monday. Sections = Tuesday and
Wednesday. Linked articles = Thursday. References list = Friday's primary sources. The model walks
that graph and adds a web search for Saturday.

## Cards

- Verbatim excerpt of two to five sentences, source title, link, one-line connector.
- Every card has an image, pulled from the source itself (Wikipedia images, Open Graph images).
- Excerpt treated as typography, big and sparse, not as a paragraph.
- Card types: text excerpt, video clip (YouTube embed with start timestamp), recall prompt.
- Roughly 20 to 30 cards per day. The daily feed ends. No infinite scroll.
- One accent color per week so each topic feels like one designed object.

## Screens

Three tabs, plus an optional fourth.

1. **Today.** The daily deck. Seven Stories-style circles on top, one per day: filled when done,
   ring on today, dim for future days. Tap any day to replay it. Thin progress bar. A "done for
   today" screen that feels like a small reward.
2. **Library.** Grid of finished weeks, each tile the topic's cover image in its accent color.
   Tap to reopen a deck. Search over every card ever read. Header with weeks completed, streak,
   topic count. This replaces both Instagram's Explore and Profile.
3. **Queue.** Upcoming topics. Optional small suggestion line ("after suits, maybe shoes").
4. **Reels (optional).** See below.

Deliberately dropped: the For You page. It is the exact thing this project replaces.

## Reels tab from YouTube

Feasible and cheap. Once a week, search the YouTube Data API for the topic with the under-four-minute
duration filter, sorted by view count. Store the video IDs, embed with the official player.

| Item | Number |
|------|--------|
| Free API quota per day | 10,000 units |
| Cost per search call | 100 units |
| Searches needed per week | 5 to 10 |

Caveats:
- No Shorts filter exists. Pull short videos and keep vertical ones (thumbnail aspect ratio or
  shorts hashtag).
- Top viewed is not top quality. Pull the top fifty, have Claude pick fifteen from titles,
  channels, and descriptions, preferring makers and educators over influencers.
- Mobile browsers block autoplay with sound. Start muted, tap to unmute. Load only the current and
  next embed.

Rule that keeps it safe: about fifteen clips for the week, two or three per day, then it ends.
Transcripts of the picked clips can also feed the deck as Wednesday cards.

## Content pipeline

Runs as a Vercel cron on Sunday night.

1. Take the next topic from the queue.
2. Walk Wikipedia (lead, sections, linked articles, references) and run a web search for recent material.
3. Ask Claude to select sources per slot and pull excerpts.
4. **Verification rule:** every excerpt must appear verbatim in the fetched source text, or the
   card is rejected. The model cannot invent a fact that survives a string match.
5. Fetch images, build the seven daily decks, store in Supabase.

Sourcing: Wikipedia API as backbone, Semantic Scholar or arXiv for papers, YouTube transcripts for
lectures, plain web search for Saturday. Personal use, so excerpting is not a copyright issue.

## Stack

- Next.js as a PWA, deployed on Vercel. Lives on the home screen, full-screen, no browser chrome.
- Supabase for decks, cards, queue, progress.
- Motion (v13) for swipe physics and card transitions.
- Tailwind for styling.
- Claude API for selection and excerpting.
- Skills to load when building the viewer: frontend-design, emil-design-eng, motion.

## Build order

1. Card viewer with a hand-made suits deck. Twenty cards written by hand. This tells you within a
   day whether you want to reach for it.
2. The content pipeline, once the viewer earns it.
3. Queue, Library, Sunday recall.
4. Reels tab.

## Name ideas

Working name for now: Social Media.

Playing on the name Gokul:
- **GOKUL** read as "Go: Know, Understand, Learn." Works as a tagline.
- **GoKnow**, **Gok**, **Kul**, **G7**.
- Rajan does not backronym well.

Standalone:
- **Burrow** (a rabbit hole dug on purpose), **Warren**, **Sevens**, **Lore**, **Depth**,
  **Sounding**, **Undertow**, **Spelunk**, **Marrow**, **Weekling**, **Sunday**, **Tide**,
  **Ken** (the range of what you know), **Wellread**, **Anorak**, **Dinner**.

German:
- **Wochenthema**, **Vertiefung**, **Fachwissen**, **Steckenpferd**.

Shortlist so far: Burrow, Ken, Vertiefung. Suggested combo: Burrow as product name with the GOKUL
tagline underneath.

## Open items

- Confirm the seven-slot arc.
- Pick the first topic (suits is a good test of a craft topic).
- Decide whether the Reels tab is in the first version or later.
- Choose a name.

## Prior art on GitHub (searched 2026-09-10)

Nothing found that combines all three of: one topic per week, a fixed depth curve, and a finite
daily feed. Closest neighbours, and what to borrow:

| Repo | What it is | Relevance |
|------|------------|-----------|
| IsaacGemal/wikitok (~1.3k stars, 176 forks, Feb 2025) | TikTok-style vertical feed of random Wikipedia articles. React, Tailwind, Vite, PWA, no backend. wikitok.vercel.app | Proves the card format works and people want it. Its weakness is ours to fix: random articles, infinite, no depth. Worth reading its card component and image preloading. |
| Zxce3/wakawiki | SvelteKit WikiTok clone with offline PWA, virtualized infinite scroll, likes, prefetching | Good reference for PWA caching and smooth scroll. |
| aam-007/deepdive | Minimal, distraction-free Wikipedia reader "for following ideas, not feeds" | Same philosophy, opposite form (desktop reader, not a feed). |
| egardner/wikipedia-deep-dive | Wikipedia reader with paragraph-level related-content sidebar via vector search | Idea for Thursday cards: semantically related paragraphs across articles. |
| thadtayo/wiki-anki | Turns Wikipedia deep dives into Anki decks | Same recall instinct as our Sunday. |
| shruthithakur03/rabbit-hole-learning | AI concept maps, YouTube Data API videos, Tavily resources, quizzes, Supabase | Uses LLM-generated explanations, which we rejected. Its YouTube and resource plumbing is similar to our Reels and Saturday plan. |
| SaabK/readash | "Learn instead of scrolling" Next.js app, abandoned | Same pitch, no depth model. |
| PerpetualBeta/JorvikDailyNews | macOS RSS reader that publishes one finite daily newspaper, "today-only, anti-doomscroll" | Same finite-daily-feed principle in a different domain. |

Takeaway: the WikiTok wave (early 2025) validated the swipeable Wikipedia card. None of the
descendants added structure. The weekly topic, the seven-slot arc, the verbatim-only rule, and the
daily end are what make this different.
