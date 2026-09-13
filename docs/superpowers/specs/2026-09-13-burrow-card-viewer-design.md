# Specter — card viewer, design spec

Date: 2026-09-13
Status: approved for implementation
Supersedes nothing. Extends `IDEA.md`, which remains the product doc.

## What this build is

Build-order step 1 from `IDEA.md`: the card viewer, with filler content, installed on an iPhone
home screen.

It exists to answer one question — **do you reach for this instead of Instagram?** Every scope
decision below follows from that. Anything that does not help answer it is out.

The content pipeline is not in this build. Neither is Supabase, the Library, the Queue, or Reels.

## Decisions

Settled during brainstorming on 2026-09-13. Recorded so they are not re-litigated.

| Decision | Choice | Why |
|---|---|---|
| Platform | Next.js PWA on Vercel, added to the iPhone home screen | `IDEA.md`'s plan. Full-screen, own icon, no browser chrome |
| Test device | iPhone | Drives the safe-area and Safari-specific work below |
| Deck surface | Instagram **home feed** — posts stack in a continuous scroll | The doomscroll surface being replaced is the feed, not Stories |
| Multi-part cards | Horizontal carousel with dots, inside a post | Lets one idea run to 3 parts without cramming a screen |
| Visual direction | Faithful Instagram copy | Chosen over an editorial and a dark-object direction |
| Colour + type | Instagram's own token values, light and dark | Not an invented palette |
| Accent | Instagram blue `#0095f6` | Per-week accent colour rejected |
| Avatar | The **publisher's** real mark | The source is the authority; seeing it is real information |
| Content | Filler pulled from Wikipedia by a throwaway script | Realistic enough to judge typography against |
| Progress | Thin bar at top, fills as the feed scrolls | Segment bars do not survive a scrolling feed |
| Day ending | Bottom of the feed, not a screen change | You arrive at it with the same thumb motion |

### Rejected, with reasons

- **Per-week accent colour** — rejected on look. Consequence accepted: the Library grid will be
  monochrome when it is eventually built. Reversible; the colour lives in ~3 CSS variables.
- **Larger caption size** — rejected. Instagram's standard 14px stands, despite excerpts running
  2–5 sentences rather than Instagram's one line. Revisit only if reading on device is bad.
- **Stories-style full-screen paging** — considered and dropped in favour of the feed.
- **Editorial and dark-object visual directions** — built as mockups, both rejected.

## Name and mark

**Name: `Specter`.** A working name — chosen to unblock the build, not settled.

**Tagline: `Scroll something worth it.`** Names the gesture, then claims this one earns it. It appears
in the manifest description, the README, and anywhere the app is introduced — **not** under the
home-screen icon, which carries the app name alone.

Considered and not taken: `doomscroll something worth it` (sharper, and the only funny one, but it
casts the user as a doomscroller daily, which is a poor engine for a year-long habit);
`worth the scroll`; `scroll that sticks`; `scroll deep, not wide`; `what stays with you`;
`a feed that ends`.

**Mark: a descending stack.** Four bars narrowing as they fall, each one fainter than the last, with
a blue weight below them. It was drawn as a sounding line — a plumb dropped to measure depth — and it
reads two other ways that are just as true: a stack of cards, and a feed with a bottom to hit.
The fading opacity also suits the name it ended up with.

Assets live in `public/`. `icon.svg` is the source of truth for the geometry; `make-icons.py` redraws
the PNGs from the same numbers rather than rasterising the SVG, which keeps edges clean at 29px —
the size used in Settings and Spotlight, and the size that kills weak marks.

Two constraints that are easy to get wrong:

- **Flat square, no rounded corners.** iOS applies its own squircle mask; drawing our own corners
  produces visible double-rounding.
- **No alpha channel.** iOS composites transparent icons onto black and it reads as a bug.

**Explored and not chosen**, recorded so the ground is not re-covered: Burrow, Ken, Vertiefung
(from `IDEA.md`); Fathom, Plumb, Strata, Steep, Versed, Lode (depth-led); Instead, Enough, Unscroll,
Compound, Slowscroll (purpose-led — named for replacing the doomscroll rather than for depth).
Deliberately rejected: `Delve`, now the tell-tale word for AI-generated text, which is the wrong
association for an app whose founding rule is that nothing is generated.

## Screens

Two routes, three surfaces. No tab bar.

### Today

- Topic name, day indicator (`Mon · 1 of 7`), progress bar.
- Seven day-circles, Mon→Sun: done days filled, today ringed in blue, future days dimmed.
- Tap today's circle to open the day. Tap a past circle to replay it.
- Future days are locked. Pacing is the product.
- **Dev unlock**: `?dev=1` on the Today URL unlocks all seven days for the session. Without it,
  testing is stuck on Monday.

### Feed

The day's deck. Covered in detail below.

### Day end

The last element of the feed, not a separate route. Blue tick, "That's Monday.", a line naming
what the day covered and what unlocks tomorrow.

## The post

Top to bottom, matching Instagram's feed post:

| Part | Spec |
|---|---|
| Avatar | 32px circle, white ground in both modes, 1px border, logo `object-fit: contain` with 4px padding |
| Source name | 14px / 600 |
| Source detail | 12px / 400, secondary colour — e.g. `Suit (clothing) · lead` |
| Image | 1:1, `object-fit: cover` |
| Carousel | Horizontal scroll-snap; dots top-centre; `n/total` counter top-right |
| Action row | Source link and bookmark icons, 24px, 1.6 stroke. Holds Instagram's rhythm; no social actions exist |
| Excerpt | 14px / 400, line-height 1.45 |
| Connector | 12px / 400, secondary colour |
| Divider | 1px below each post |

### Avatar resolution

1. **Known source** → its proper mark. Wikipedia uses the Commons logo.
2. **Any other domain** → `https://www.google.com/s2/favicons?domain=<domain>&sz=128`
3. **Neither loads** → grey monogram, first letter of the source name.

Rule 3 is required, not decorative. A card must never break because an image 404s.

## Tokens

Instagram's values. Mode follows the iPhone system setting; no in-app toggle in this build.

| Role | Light | Dark |
|---|---|---|
| Background | `#ffffff` | `#000000` |
| Raised surface | `#fafafa` | `#121212` |
| Text | `#262626` | `#f5f5f5` |
| Text, secondary | `#8e8e8e` | `#a8a8a8` |
| Divider | `#efefef` | `#262626` |
| Border | `#dbdbdb` | `#363636` |
| Link | `#00376b` | `#e0f1ff` |
| Accent | `#0095f6` | `#0095f6` |

Note: light-mode text is `#262626`, not `#000000`. Type: 14/600 source, 14/400 excerpt,
12/400 secondary, system font stack (SF Pro on iPhone).

## Data

One JSON file in the repo. No database.

```json
{
  "topic": "Suits",
  "week": 1,
  "days": [
    {
      "day": "monday",
      "slot": "The map",
      "cards": [
        {
          "source": "Wikipedia",
          "domain": "en.wikipedia.org",
          "detail": "Suit (clothing) · lead",
          "url": "https://en.wikipedia.org/wiki/Suit_(clothing)",
          "media": ["https://…"],
          "excerpt": "A suit, also called a lounge suit…",
          "connector": "Start with the word itself — everything else is a variation on this."
        }
      ]
    }
  ]
}
```

`media` is an array. Length 1 renders a plain post; length > 1 renders a carousel. This is the only
thing distinguishing the two, and it is why no separate card type is needed.

The schema is deliberately source-agnostic — it never encodes "Wikipedia". When the pipeline
arrives it writes this same shape from any publisher.

### Filler content

The filler is not neutral. A day built by pulling 25 consecutive paragraphs out of one Wikipedia
article would be crushingly boring, and would return a **false negative** — the conclusion would be
"the product does not work" when what actually failed was the filler script.

So the throwaway script must produce structural variety, even though it curates nothing for quality:

- **Several source articles per day**, not one walked top to bottom.
- **Mixed excerpt lengths.** Some cards one sentence, some four. Short cards between long ones.
- **At least two carousels** in the day, to break the vertical rhythm.
- **At least one image-led card** with barely any text.
- **Varied register where Wikipedia allows it** — a definition, a date, a diagram, a photograph,
  a quoted objection.

This is roughly twenty minutes of extra scripting and it is what makes the week of use mean anything.

**The risk it is protecting against.** Instagram holds attention through unpredictable subject and
unpredictable emotional register. A day on one topic has neither by construction — that is the point
of the product and also the removal of the mechanism the habit runs on. The mitigations are that the
bar is lower than "beat Instagram" (a finite 6–7 minute deck competes differently from an infinite
feed), and that unity of subject still permits variety of register. Both depend on the deck being
ordered for **rhythm** rather than logic.

The honest failure mode is not Monday, when any topic is fresh. It is Thursday — day four of a topic
you are not already invested in. Testing a Thursday deck rather than a Monday deck is available and
would be the harder, more honest test; not taken for this build.

### Progress

`localStorage` on the phone. Which days are complete, and the card index reached within a day.
Clearing Safari data resets it. Acceptable for a single-user test.

## Structure

Small, single-purpose files.

```
app/
  layout.tsx            PWA shell, viewport, theme-color, safe areas
  page.tsx              Today
  day/[day]/page.tsx    Feed
components/
  DayCircles.tsx
  Feed.tsx              scroll container + progress driver
  Post.tsx              one post
  Carousel.tsx          horizontal scroll-snap + dots
  SourceAvatar.tsx      3-step resolution + fallback
  DayEnd.tsx
lib/
  content.ts            load deck JSON, types
  progress.ts           localStorage read/write
content/
  suits.json
scripts/
  fetch-filler.ts       throwaway Wikipedia puller
public/
  icon.svg              source of truth for the mark
  apple-touch-icon.png  180 — the one iOS actually uses
  icon-192.png, icon-512.png, favicon-32.png
  manifest.json
scripts/
  make-icons.py         redraws the PNGs from the same geometry
```

## iPhone specifics

Easy to skip, and the whole difference between "an app" and "a website pretending".

- `manifest.json` with `display: "standalone"`
- `apple-touch-icon` — iOS ignores manifest icons
- `apple-mobile-web-app-capable` meta
- `viewport-fit=cover` plus `env(safe-area-inset-*)` for notch and home indicator
- `overscroll-behavior: none` on the body to kill the rubber-band bounce
- `-webkit-touch-callout: none` and `user-select: none` on cards, so long-press does not
  raise Copy/Share
- `theme-color` for both colour schemes

**Known limitation:** no haptics. iOS does not expose vibration to home-screen web apps. Accepted
as the cost of not going native.

## Out of scope

Library, Queue, Reels, Supabase, the Claude pipeline, the verbatim verifier, the Sunday cron,
search, streaks, accounts, offline caching, push notifications.

## Banked for the pipeline

Decided on 2026-09-13, not built here. Recorded so the decision is not remade.

**Sources are multi-publisher, not Wikipedia-only.** Wikipedia is the spine for Monday and Tuesday
because its structure is free — lead = the map, sections = origins and mechanics, linked articles =
the arguments, reference list = primary sources. Domain authorities carry Wednesday to Saturday,
where Wikipedia is encyclopedic rather than expert and lags on anything recent.

**Source trust model: a seed list the user curates, which the model may extend.** Per domain, a short
curated list — menswear: Permanent Style, Die Workwear, The Rake. Phones: GSMArena, AnandTech.
The model must prefer listed sources, may search beyond them when a slot has no match, and is
blocked from known SEO content farms. Same division of labour as the verbatim rule: the model finds
and excerpts, the user decides what counts as authoritative.

**Decks are ordered for rhythm, not just logic.** Walking a source top to bottom produces a correct
arc and a boring one. Within a day, alternate register and length deliberately — a definition, then a
photograph, then a one-line objection, then a diagram. The connector line in `IDEA.md` is the tool
for this, but only if selection optimises for contrast between adjacent cards as well as for the
slot's subject. See "Filler content" above for why this is load-bearing.

Two consequences to plan for:

- **Verification gets more expensive off-Wikipedia.** Wikipedia's API returns clean text to
  string-match against. Arbitrary sites need HTML→text extraction first. Paywalled sources will fail
  extraction and must be skipped cleanly, never half-fetched.
- **Images get less reliable.** Wikipedia images are freely licensed and stable. Hotlinked Open Graph
  images can break on referrer policy. A card without an image must still look deliberate.

## Still open

Carried from `IDEA.md`, not blocking this build.

- Confirm the seven-slot arc against a real week.
- Whether Reels ships at all.
- The name is `Specter`, chosen as a **working name**. See "Name and mark" above for the candidates
  already explored, so that ground is not re-covered if it changes.

## Done means

Installed on the iPhone home screen, opening full-screen. Today shows seven day-circles. Tapping
today opens a scrolling feed of filler posts drawn from several articles, with mixed excerpt
lengths, at least two carousels and at least one image-led card. The progress bar
tracks the scroll. The feed ends in "That's Monday." Progress survives closing and reopening the app.
Both colour schemes correct.

Then: use it for a week, and decide whether it earns the pipeline.
