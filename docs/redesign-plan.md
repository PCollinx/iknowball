# Redesign plan: one screen at a time

Started 21 Oct 2026. Goal: every screen gets the navbar and footer, then each is redesigned to match the
home page ("Matchday ticket") and its layout improved. We take one screen per step, and each step ends
merged before the next starts.

Launch is Fri 27 Nov (beta from 16 Nov), so the screens players touch most come first.

## What "match the home page" means

The home page set the kit. Reuse it before inventing anything new:

| Piece | Where | Use it for |
| --- | --- | --- |
| Programme navbar | `src/components/nav/SiteNav.tsx` | Top of every public screen |
| Footer | `src/components/nav/SiteFooter.tsx` | Bottom of every public screen (not mid-round) |
| Sticker + album slot | `src/components/home/Sticker.tsx` | A card that is "the thing" on a screen |
| Scoreboard block | `src/components/home/LeagueBoard.tsx` | A big place or number on navy |
| Ticket | `src/components/home/ClashTicket.tsx` | Something you "enter" (a sprint, an invite) |
| Buttons | `btn-teal`, `btn-navy`, `btn-press` in `globals.css` | Every button that isn't a full-width royal bar |
| Royal bar with sash | `bg-royal sash` | The one main action on a screen |
| `sash-mark` letters | `globals.css` | Short words like "or", "vs" |
| Keepy-uppy | `src/components/loading/KeepyUppy.tsx` | Every loading state |

House rules still stand (CLAUDE.md, "Look and type"): white background, navy text, no soft rounded card
stacks, gradients or emoji, motion only through `motion-safe:`.

## How each step runs

1. **Look:** read the screen and list its states (empty, guest, signed in, error, every round type).
2. **Mock:** 2 to 3 options on a canvas, phone and desktop, in the real colours. Collins picks or mixes.
3. **Build:** reuse the kit above; real data, no sample copy left behind.
4. **Check:** 320, 390, 768, 1024 and 1440 px with no sideways scroll; reduced motion; `npm test`,
   `typecheck`, `lint`, `build`; look at it in the browser. If a new class doesn't show in dev, save
   `globals.css` (Tailwind rescans).
5. **Commit** on the step's branch. **Push and open a PR** only when Collins says so; he merges.
6. **Record** the decision in CLAUDE.md and tick the step below.

## Step 0: navbar and footer everywhere

One step, before any redesign, so every later screen starts inside the same frame.

- **Make the navbar self-sufficient.** It reads the player's rating itself (in its own Suspense, so pages
  stay fast and static shells stay static) and works out the active section from the URL, so no page has
  to pass anything in.
- **One shared layout** for the public screens (a `(site)` route group, or the root layout with the maker
  opted out), holding the navbar above the page and the footer below. Pages drop their own wrappers.
- **Page mastheads stay, slimmer.** The "The Daily · No. 004" and "Clash · Sprint" lines become the page's
  own header under the navbar (no second brand line).
- **Match mode during a live round** (agreed 21 Oct 2026). While a Daily part or a Clash sprint is running,
  a full navbar and footer invite a mis-tap that throws away a timed attempt, so the navbar shrinks to the
  logo (not a link) and a "Live" tag, the round keeps its own clock, and the footer hides, until full time.
- **Add a 404 page** in the same frame (there isn't one yet), and put the Daily's error screen inside it.
- **Out of scope:** the maker (`/maker/*`) keeps its own admin bar and look; its redesign was dropped (Collins, 27 Oct 2026).

Screens covered: `/clash`, `/clash/[code]`, `/daily`, `/daily/table`, `/league`, `/league/[code]`,
`/league/everyone`, `/league/fans`, `/profile`, `/privacy`, home, 404, errors.

## The redesigns, in order

### 1. The Daily: kick-off
`/daily` before you start. The fixture, both parts and their round types, the clock, one try, the
matchday nudge for your club. Should feel like walking out of the tunnel from the home page's sticker.

### 2. The Daily: in play
The four round types: Free Recall (the answer box and shirt grid), In Order, Rapid picks, Era picks. The
countdown, feedback on each answer, the switch from Part 1 to Part 2. Match mode applies here. Mobile
first: thumbs, keyboard open, nothing jumping.

### 3. The Daily: full time and sharing
Score out of 100, what you found and missed, your place today, the club prompt, "Share the card".
Includes the share card PNG (`/daily/card`) so the image matches the new screen.

### 4. Today's table
`/daily/table`: your row, the top of the day, guests. Probably the scoreboard look.

### 5. Clash: kick-off and sprint
`/clash` (rules and kick-off) and the 60-second sprint: tale of the tape, higher / lower / level, the
shootout row, the clock. Match mode applies to the sprint. Should continue the home page's ticket.

### 6. Clash: full time and challenges
Full time (the share card), the challenge link page `/clash/[code]` with "beat N" and its table of everyone
who played the set, and the Clash result PNG.

### 7. The League hub
`/league`: your leagues, Everyone, your club's fans, start and join. Builds on the home page's board.

### 8. A league
`/league/[code]`: the invite (outsiders) and the table (members), the shirt ladder, leaving, ownership.
Built together with step 7 (Collins, 26 Oct 2026): the hub's look decides the league page's, so both were
mocked and picked as one (option D).

### 9. Everyone and fans
`/league/everyone` and `/league/fans`.

### 10. Your shirt
`/profile`: signed out, guest, signed in; the shirt, rating, tier, stats, club picker (with the switch
rule), name, email or Google save, sign out. Fix the missing "Saved" after picking a club.

### 11. Privacy, 404 and errors
Final privacy copy once Collins has reviewed it (drop the "Draft" tag, add the contact address), and the
404 and error screens in the new style.

### 12. The waitlist (last)
PR #31, held until 1 Nov: rebase it onto the new home and frame, then redesign it in the same style. The last
redesign we take on (Collins, 21 Oct 2026).

## Also on the list

- **Share images** (`src/lib/daily/ShareImage.tsx`, `src/lib/clash/ResultImage.tsx`) follow their
  screens in steps 3 and 6.

## Progress

- [x] 0. Navbar and footer everywhere (PR #40)
- [x] 1. The Daily: kick-off (PR #41)
- [x] 2. The Daily: in play (PR #42)
- [x] 3. The Daily: full time and sharing (PR #43)
- [x] 4. Today's table (PR #44)
- [x] 5. Clash: kick-off and sprint (PR #45)
- [x] 6. Clash: full time and challenges (PR #46)
- [x] 7. The League hub (PR #48)
- [x] 8. A league (PR #48, built with step 7)
- [x] 9. Everyone and fans (PR #49)
- [x] 10. Your shirt (PR #50)
- [x] 11. Privacy, 404 and errors (PR #51)
- [ ] 12. The waitlist
