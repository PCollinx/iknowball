# Launch plan

Everything left between now and launch on **Fri 20 Nov 2026** (fallback Fri 27 Nov), in one place. Renamed
from the redesign plan on 29 Oct 2026 (Collins): steps 0 to 14 are the redesign, one screen at a time
(started 21 Oct 2026); steps 15 to 18 are what's left to build for launch; then the dates and Collins's own
to-dos. Each step ends merged before the next starts.

Launch is Fri 20 Nov (beta and the waitlist from Sun 1 Nov; replanned 27 Oct 2026), so the screens players
touch most came first.

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

### 12. The logo
Added 27 Oct 2026 (Collins). The mark used everywhere: navbar, footer, favicon and app icon, share cards
and image code (`src/lib/og/`), and the 1 Nov name reveal on X. Today it's a small royal shirt with "10" and
the IKNOW/BALL wordmark. Mocks of a few directions (shirt-back, ball, badge-free wordmark; never a crest),
shown at every size it's used, from 16 px favicon to the X header. Before the waitlist, which shows it.

### 13. The waitlist
Goes public on 1 Nov (beta starts the same day; launch Fri 20 Nov). Option A (Collins, 27 Oct 2026): until
launch the public sees the waitlist at playiknowball.com instead of the games, and beta testers get in by
invite. Built fresh in the new frame and style, reusing PR #31's sign-up action, checks, honeypot and queue
number, behind a date switch; then close #31. Must be merged by Sat 31 Oct.
Built 28 Oct 2026 (option A with C's game stickers, PR #56; #31 closed). Before 1 Nov: set `BETA_CODE` (8+ characters) in
Vercel > Settings > Environment Variables for Production and redeploy, or nobody gets past the waitlist.
The invite link is then `playiknowball.com/beta/{BETA_CODE}`.

### 14. Support iKnowBall
Added 27 Oct 2026 (Collins). The page behind the footer's "Support iKnowBall" link (`SUPPORT_URL` in
`src/lib/site.ts`, shown as "Soon" until set): what support pays for and how to give. Needs a decision on
the payment route first (for example Paystack for Nigeria, Buy Me a Coffee or Ko-fi). Not at launch: we
launch on Vercel Hobby, which allows no donations, so it waits for the switch to Pro (CLAUDE.md, Hosting).

## To build for launch

### 15. The installable app (PWA)
Added 29 Oct 2026 (Collins: built before launch, no longer on hold). Add to home screen on Android and
iPhone, opening full screen like an app: a web manifest (name, the light-teal app icon from
`src/lib/og/logo.tsx` at 192 and 512 px plus a maskable one, navy text on white, `display: standalone`),
the iPhone meta tags, and a small offline screen in the house style ("No signal", like the VAR monitor).
No offline play: answers are checked on the server. Mock the install prompt and the offline screen first.
Keep it off the first-load budget (about 200 KB). By Sun 8 Nov, so beta testers install it.

### 16. The launch email
The waitlist promises "We'll email you on Fri 20 Nov when the gates open". One email to everyone on the
sheet, through Resend (already set up for sign-in): their shirt and number, the link, the first Daily. A
job or admin button that sends in batches, records who was sent to (so a rerun skips them) and has an
unsubscribe line. Mock the email first. Test on dev, send on the morning of 20 Nov.

### 17. Waitlist leagues on day one
The sheet says "Bring your league and your league starts on day one", but the league name it saves isn't
connected to anything yet. Decide with Collins: make those leagues at launch (the person who named it
becomes captain once they sign in with the same email, and gets the invite code), or soften the line on
the page. Decide by Sun 8 Nov, build by 18 Nov.

### 18. The demo video on the waitlist
The demo video goes out Thu 19 Nov and is pinned on the waitlist page for its last day. Add a slot for it
under the team sheet (a link to the post on X, or the video itself), switched on by a date or a setting.
By Wed 18 Nov.

### 19. Popular games only
Added 29 Oct 2026 (Collins: live Dailies paired bottom-of-the-table clubs nobody knew). Decided: the big
six (ARS, CHE, LIV, MCI, MUN, TOT) in every Daily, at least one of them; Europe's giants on UCL nights
(before launch); Clash draws famous players at top clubs. **Built, committed on `claude/popular-games`
(c3aa478), not pushed; migration `20261029000000_popular_games` is on dev only.** Rules in CLAUDE.md
("Popular games only"). To finish, in order:
1. Check the dev import of the nine European clubs and the big six (log in the session scratchpad, or rerun
   `/api/jobs/import-wikidata?club=…`): clubs have players, `players.sitelinks` is filled.
2. Check Clash on dev: `select count(*) from clash_pool('apps', 40, 1000, true)` and the same for goals
   (each needs 40+ for a set); play a sprint and see that the names are famous.
3. Run the drafts job on dev and review in the maker: every day has a big six club; 3 Nov should be a UCL
   tie (Barcelona v Aston Villa or Atlético v Bayern) if its list is good.
4. Push and open the PR; Collins merges.
5. Live: `npx supabase link --project-ref edggdeqvfmezibxmttsz`, `migration list`, `db push`; the daily
   Wikidata job picks up the new clubs (or run them by hand), the fixture sync adds UCL that night.
6. Delete the live drafts already made for the coming days in the maker, so they redraft under the rules.

## Dates and Collins's to-dos

- [ ] **Before Sun 1 Nov:** set `BETA_CODE` (8+ characters) in Vercel Production and redeploy.
- [ ] **By Sat 31 Oct:** last teaser quizzes on X (no app name on them until 1 Nov).
- [ ] **Sun 1 Nov:** the waitlist goes up at midnight WAT by itself; reveal the name and the waitlist on X;
  send the first beta invite links to the most engaged followers.
- [ ] **Sun 8 Nov checkpoint:** Collins and three friends trade Clash challenge links.
- [ ] **9 to 15 Nov checkpoint** (international break): a real league plays a full week of Dailies and the
  table is right.
- [ ] **During the beta:** tune the tier cut-offs on real ratings; record the demo video.
- [ ] **Thu 19 Nov:** publish the demo video on X and WhatsApp.
- [ ] **Fri 20 Nov:** the waitlist comes down at midnight WAT by itself; send the launch email (step 16).

After launch: step 14 (Support, with Vercel Pro), Rate mode (18 Dec), whether to buy iknowball.com.

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
- [x] 12. The logo (PR #55)
- [x] 13. The waitlist (PR #56)
- [ ] 14. Support iKnowBall (after launch, with Vercel Pro)
- [ ] 15. The installable app (by 8 Nov)
- [ ] 16. The launch email (by 19 Nov)
- [ ] 17. Waitlist leagues on day one (decide by 8 Nov, build by 18 Nov)
- [ ] 18. The demo video on the waitlist (by 18 Nov)
- [ ] 19. Popular games only (built, to check and merge first thing, 30 Oct)
