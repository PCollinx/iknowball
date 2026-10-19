@AGENTS.md

# iKnowBall

Project memory for Claude Code, carried over from the Claude project where the plan was made (Oct 2026). Owner: Collins (GitHub `PCollinx`). Keep this file current: when a decision is made or an open item closes, update it here.

## Product

- Name: **iKnowBall** (short form IKB, never "YKB"). Domain **playiknowball.com**. The domain lives only in `NEXT_PUBLIC_SITE_URL`; if it ever moves (e.g. to iknowball.com, which may be bought later), the old one must redirect forever.
- A knowledge-first football app: one rating with tiers. Nigeria-first, plus UK and global football Twitter. Tone is confident banter, not British nostalgia. Inspired by futoteca.club.
- Three pillars:
  - **The Daily**: one try per day in two parts, Part 1 Free Recall then Part 2 In Order (one `dailies` row per part), timed, themed on the Premier League fixtures. Lives at `/daily`. Written in the **Daily maker** at `/maker` (admins only: `profiles.is_admin`, email and password sign-in). It saves a whole day through `public.maker_save_day()` in one transaction, and a part locks once anyone has started it.
  - **Round types** (19 Oct 2026, Collins chose "Both"): Part 1 is Free Recall (type names) or **Rapid picks** (tap the one of four players who played for both clubs); Part 2 is In Order or **Era picks** (tap the period a player was at a club). Picks are one `daily_answers` row a question (`answer_text` right, `choices` as shown, `question`), one tap each, checked on the server, 25 points a right tap. Auto-drafts mix them: the four pairings take turns by date (`pairingFor` in `src/lib/drafts/generate.ts`), so each week has all four; a picks round the data can't fill falls back to the typed one. The maker can switch either part.
  - Content is **auto-drafted, reviewed weekly** (decided 16 Oct 2026). `/api/jobs/import-wikidata` (daily, a few clubs per run, each club refreshed weekly) loads PL-era player club spells from Wikidata into `player_spells`; `/api/jobs/drafts` (20:00 WAT daily) drafts empty days 8 ahead (Part 1 "played for both X and Y since 1992", Part 2 order of joining) and schedules any still-draft day due tomorrow. Collins reviews drafts (teal "Auto" tag) in the maker. Answers always come from data; AI may only help with wording. Code in `src/lib/drafts/`.
  - **Clash**: 60-second duels (Higher/Lower facts, skill-specific player comparisons, crowd vs data). At launch: solo sprint plus async challenge links. Rate mode feeds the vote pool (about 100 votes for a comparison to enter play).
  - **Clash sprint built** (19 Oct 2026, ahead of plan): `/clash` kicks off a 60-second Higher or Lower sprint on one stat (league goals or league games for a club, from `player_spells.apps`/`goals`, which Wikidata fills from P1350/P1351). Layout "Tale of the tape" with the shootout row on top (footballs for right, red crosses for wrong). A wrong call costs 5 seconds; a tie is right whatever you pick. Each sprint is a `clash_sets` row of 40 players with a 6-character code; `/clash/{CODE}` is the challenge link (same players, same order, one go each, table of everyone who played it). Rules in `src/lib/clash/rules.ts`, data in `src/lib/clash/data.ts`, `public.clash_pool()` draws players. Test sites with no player data use a sample pack (`src/lib/clash/sample.ts`).
  - **Full time is the share card** (Collins, 19 Oct 2026): no separate result card. It shows the score, a red missed stamp, a 2rem rating tag at the top right, the shootout row and stats; "Share the card" sends `/clash/{CODE}/card`, the same screen as a 1080 × 1080 PNG (`src/lib/clash/ResultImage.tsx`).
  - **The League**: mini-leagues with invite codes, scored per PL matchweek (Mon to Sun), plus a global weekly table and the overall rating.
  - Predictions come after launch.
- Web app first, mobile-first, with its own desktop layout from about 1024px.
- No Premier League branding or club crests. Player cards are code-generated shirt-back cards, never faces.

## Look and type (chosen 15 Oct 2026)

- Theme **Royal and Teal**. Tokens live in `src/app/globals.css` (Tailwind: `text-royal`, `bg-teal`, `bg-mist`, and so on).
- The background is **always white** (#FFFFFF): no dark theme. Navy `#0C1330` is the text colour.
- Royal blue `#1F48D6` leads: shirts, correct answers, the answer box. Teal `#00A3A3` is the countdown (bar and tab), tier badge and highlights; light teal `#7FE3E0` for shirt numbers. Mist `#EEF2FB` fills, track `#DCE3F5`, red card `#D7263D` for banter and warnings. Pitch green and yellow were tried and rejected.
- Type: **Big Shoulders** 900 (`font-display`, uppercase) for headings, numbers and shirt names; **Barlow** 400 and 600 (`font-sans`) for everything else. Both self-hosted by `next/font` in `src/app/layout.tsx`.
- Screen layouts are designed screen by screen as clickable mocks, then built. Rule from Collins: nothing that looks like a generic AI-built app (no soft rounded card stacks, gradients, emoji icons or centred everything); borrow from football itself.
- **The Daily uses the "Programme" layout** (picked 15 Oct 2026): a printed matchday programme with an issue-number masthead, double rules, a huge fixture headline, a teal scoreboard clock that turns red near the end, answers as a grid of shirt-backs and a royal answer box. Desktop is the programme opened flat (fixture left, squad right). Mocks: https://claude.ai/artifact/VdB3kEGoVSK2XcQ7hB8BVh
- **Shirts are drawn as kits** (18 Oct 2026, `src/components/daily/ShirtBack.tsx`): club pattern (`clubs.kit_pattern`: plain, stripes, bars, pinstripes, sleeves, band, hoop, sides, yoke) and collar (`clubs.kit_collar`: crew or polo) in `shirt_colour`/`trim_colour`, collar, cuffs, hem, flat shading, navy outline. Lettering is the nameplate: a navy tag on the hem with the name; text is sized to fit, never squeezed. The Daily's answer shirts wear the fixture's two clubs half and half (royal if a club isn't known), with a big number and the surname on the tag. Clubs that share colours must differ by pattern or collar (Collins, 18 Oct 2026). Collins wants this level of refinement across the whole app.
- **Share card: "Programme cover"**, square 1:1: masthead, fixture, big score beside numbered and empty shirts (how many, never who), a red "N short" stamp, a stats strip and a teal "Think you know ball? Beat N." footer. Code: `src/components/daily/ShareCard.tsx`. The same card is drawn as a 1080 × 1080 PNG at `/daily/card` (your own, after full time; `src/lib/daily/ShareImage.tsx`), shared from full time by "Share the card" (phone share sheet, else a download). Satori fails on number text nodes and undefined style values. Shared next/og pieces (fonts, kit shirt) live in `src/lib/og/`.
- **Teaser quiz images for X** (18 Oct 2026): `/maker/teaser` (admins only) draws a PNG on the server with `next/og` (`src/lib/teaser/`, route `/maker/teaser/image`), wide 1600 × 900 or tall 1080 × 1350. "Name them" (numbered shirts, "?" on the tag, or names for the answers post) or "Put in order" (lettered shirts). No app name on it until 1 Nov. It warns when a teaser shares clubs or a player with a Daily in the next 14 days. Satori can't read next/font's woff2, so TTF copies of the fonts live in `src/assets/fonts/`.
- Picker page with all rounds: https://claude.ai/artifact/99Qnj4Vm79G3JeDY24KUTp

## Data

- **Primary source: Highlightly, free plan** (commercial use confirmed by Collins, 13 Oct 2026). Base URL `https://soccer.highlightly.net`, header `x-rapidapi-key`, 100 requests/day free (paid from $9.49/mo for 7,500/day). 2026/27 PL is league id `33973`, `season=2026`.
  - `/box-score/{matchId}` gives per-player duels won, key passes, successful dribbles, interceptions, tackles, shots, xG, xA and a match rating.
  - Season totals for those stats are not in `/players/{id}/statistics`: aggregate box scores in our database (about 10 calls per matchweek).
  - `/matches` lists newest first. Lineups are only served from 40 min before to 120 min after kickoff, so fetch them on match day.
- Wikidata (CC0) feeds player club histories (`player_spells`, `clubs.wikidata_qid`). The tracked clubs list is `src/lib/drafts/clubs.ts`.
- Fallback: API-Football Pro ($19/mo). Its free plan blocks the current season.
- Also usable: Wikidata (CC0) for player facts, football-data.org as a backup.
- Ruled out: FBref, scraping FotMob/Understat/Transfermarkt, StatsBomb open data, the unofficial FPL API as a core source.

## Stack

- Next.js 16.4 App Router + TypeScript on Vercel (read `node_modules/next/dist/docs/` before writing Next code; see AGENTS.md). Tailwind 4 via the Turbopack loader. Next 16 notes: middleware is `src/proxy.ts`; `cacheComponents` is on, so don't use `export const dynamic`. ESLint stays on 9 until eslint-config-next supports 10.
- Supabase: Postgres, guest auth (anonymous sign-in; a trigger creates the `profiles` row), RLS, cron. Clients in `src/lib/supabase/` (`client.ts` browser, `server.ts` server, `admin.ts` service role, server only). Schema in `supabase/migrations/`; regenerate types with `npm run db:types`.
- Env vars validated with zod in `src/lib/env.ts`; the full list is in `.env.example`.
- PostHog (EU) in `src/instrumentation-client.ts`, lazy-loaded on idle and proxied through `/ingest`. Sentry (`@sentry/nextjs` 11, org `collins-sb`, project `iknowball`) lazy-loaded on idle with an early-error buffer, tunnel route `/monitoring`. First-load JS budget about 200 KB gzipped (currently about 176 KB): keep heavy libraries off the first load.
- Later: PWA, Expo for native.
- Checks: `npm test` (vitest), `npm run typecheck`, `npm run lint`, `npm run build`.

## House rules

- **Players never trigger a football API call.** Scheduled jobs fetch from Highlightly into our database; screens read from the database. Job routes live under `/api/jobs/*` and require `CRON_SECRET`. Count every Highlightly call against the daily limit.
- **The quiz timer starts on the server and answers are checked on the server.** Answer matching uses aliases plus typo tolerance. The answer key tables (`daily_answers`, `player_aliases`) have no client RLS policy; attempts and scores are written by the service role only.
- **The Daily closes at midnight WAT (GMT+1) all year** (= `Africa/Lagos`, 23:00 UTC; it doesn't move with UK clock changes). Matchweeks run Mon to Sun on the same clock. Use `src/lib/time.ts` and `public.game_date()`, never ad-hoc date maths.
- **Midweek PL rounds** belong to the same Mon to Sun matchweek, scored once. Fixtures carry `pl_round` and an `is_midweek` flag. Sunday's content covers both rounds, sync jobs run after each round, and the scoring formula must not let double-round weeks outweigh normal ones.
- Never put secrets in code, commits or chat. `NEXT_PUBLIC_*` values go to the browser; the service role key never gets that prefix.

## Gotchas

- `NEXT_PUBLIC_*` vars are baked in at build time: after adding or changing one in Vercel, redeploy.
- `/api/health` shows the live commit, whether the database answers, and whether Sentry/PostHog keys are in the build. Check it first when something seems missing, then redeploy.
- Sentry auth token lives under Settings > Developer Settings > Organization Tokens (not the project Security Token).
- DNS is on Cloudflare (apex CNAME flattened to Vercel, grey cloud).
- Production hides server errors behind "Minified React error #441": the real message is in Sentry > Issues or Vercel > Logs.
- Every server variable in `src/lib/env.ts` must be set in Vercel, or any page using the service role (including `/daily`) fails. `/api/health` doesn't check `CRON_SECRET`, which must be 16+ characters. On 15 Oct 2026 it was empty.
- `npx supabase db push` goes to whichever project was linked last. Always `npx supabase link --project-ref <ref from NEXT_PUBLIC_SUPABASE_URL in Vercel>` and `npx supabase migration list` first. On 15 Oct 2026 the Daily migration went to the wrong project ("column dailies.part does not exist").
- Running locally (Docker Desktop + local Supabase, `.env.local` from `npx supabase status -o env`, stop and start) is in README.md. The seeded sample Daily is only for the day of `npx supabase db reset`. Test sites (previews and local, `VERCEL_ENV` not production) never show "No Daily today": an empty day gets today's drafts scheduled or a sample Daily, and full time offers "Play it again" (`src/lib/daily/sample.ts`). Production never does either.

## Timeline

Replanned 16 Oct 2026 because the build is ahead (plan doc: https://claude.ai/code/artifact/ddd3e7d2-6471-4dfa-845b-6b90ef603740):

- Done: setup (15 Oct); The Daily, the maker and Wikidata auto-drafts (15 to 16 Oct).
- Oct 17 to 25: accounts (guest to Google/email-link sign-in), profile shirt, favourite club.
- Oct 26 to Nov 1: Daily polish (server share-card images, best-5-of-7 day scores, daily leaderboard). Waitlist page Nov 1.
- Nov 2 to 8: Highlightly fixture sync, leagues and rankings (a week earlier than first planned). Checkpoint Nov 8.
- Nov 9 to 15: Clash solo sprint + async challenge links as a stretch goal for launch; PWA install. Nov 15 check decides whether Clash ships at launch or on 18 Dec.
- Nov 16 to 25: closed beta. **Launch Fri 27 Nov 2026** (fallback 4 Dec; if the build slips, Clash drops back to 18 Dec first). Demo video recorded in the beta, published Thu 26 Nov on X and WhatsApp, pinned on the waitlist page.
- Audience warm-up on X (added 16 Oct): Oct 19 to 31 teaser quizzes as shirt-back images, no name; Nov 1 reveal the name and waitlist; Nov 16 to 25 beta invites to the most engaged followers; Nov 26 demo video. Never post a question from an upcoming Daily. Needs a quick question-to-image export by Oct 19.
- Rate mode (plus Clash if it missed launch): 18 Dec 2026. Native decision: 1 Mar 2027. Android: July 2027.

## Rating and scoring (decided 16 Oct 2026)

- **Overall rating out of 10** (19 Oct 2026, Collins; replaced the 1000-point rating): one decimal like a sports app (7.6, 8.9), 10 is perfect. It is the average of your day scores ÷ 10 over your last 30 days played, each older day counting 0.9 of the one after it; missed days cost nothing (`overallRating()` in `src/lib/profile/rating.ts`, worked out from attempts, not the old `ratings` table). Shown as a circle coloured like a match rating: red below 5, orange 5, yellow 6, green 7+ (`RatingBadge`), at the top right of the profile shirt, on the share card's masthead and on full time.
- **Tiers**: Plastic, Casual, Supporter, Ball Knower, Pundit, Ball God, placed after 3 Dailies. Cut-offs by rating, to tune in the closed beta: below 4.0 Plastic, 4.0 Casual, 5.5 Supporter, 7.0 Ball Knower, 8.0 Pundit, 9.0+ Ball God.
- **Matchweek score, best 5 of 7**: each Daily day scores 0 to 100 (Part 1 up to 60, Part 2 up to 40, by share of answers right, so a day with more answers weighs the same). A week counts your best 5 days, max 500. Clash adds up to 100 a week from your best 3 sprints once it launches. Ties go to less total time on the counted days.
- Predictions, when they come, get a fixed weekly pot split across however many matches there are, so double-round weeks never outweigh normal ones.
- Built (19 Oct 2026): the day score is `partScore()` in `src/lib/daily/score.ts`, shown at full time and on the share card, and **today's table** at `/daily/table` (`dayTable()` in `src/lib/daily/data.ts`; guests without a username show as "Guest" plus 4 characters of their id). Scores are worked out from `correct_count` and `answer_count`, not the stored `attempts.score`, so older attempts rank on the same scale.

## Profile and favourite club (decided 16 Oct 2026)

- `profiles.favourite_club_id` stays and is optional. Ask once, skippable, after a guest's first Daily ("Who do you support?"); neutrals allowed; list = PL clubs plus a few big non-PL clubs followed in Nigeria.
- It is used in exactly three ways, and never changes questions, scores or rating:
  1. **Your shirt**: the profile is a shirt-back card in the club's kit, with a navy nameplate on the hem carrying the username, then the tier, with the rating badge at the top right ("C2", picked 18 Oct 2026; the earlier "tier as the number" was replaced).
  2. **Fanbase table**: a weekly League table of clubs ranked by their fans' average score.
  3. **Matchday nudge**: when your club is in that day's Daily, the page says so and the share card tags it.
- A player can switch club **once a season**, so nobody hops clubs to climb the fanbase table.
- The profile page shows the shirt, rating, tier, placement progress, streak, this week's best-5 score and leagues. No photos.
- Built (Oct 2026): `/profile`, the prompt on the Daily's full-time screen, the matchday line on kick-off and the share-card tag. The switch rule lives in the database (trigger `guard_favourite_club`): picking a club when you have none is free; changing or dropping one uses the season's switch. Seasons turn over on 1 July (`public.game_season()`, `seasonOf()` in `src/lib/time.ts`).
- The picker lists `clubs.fan_pick` rows (Premier League first by `in_premier_league`). `clubs.short_name` is unique and is the key the importer upserts on. After promotion and relegation, flip `in_premier_league` and `fan_pick` (2026/27 done in migration `20261018110000`: Coventry, Hull, Ipswich up; West Ham, Burnley, Wolves down).
- Accounts: guests are upgraded in place (same user id, so every Daily is kept) by email link (`updateUser`) or Google (`linkIdentity`, needs manual linking on in Supabase Auth). Both land on `/auth/callback`.

## Open items

- Whether to buy iknowball.com.
- Clash at launch or 18 Dec: settled at the Nov 15 check.
- Switch Vercel to Pro ($20/mo) before launch: Hobby is non-commercial only.
- Send auth emails through Resend SMTP (decided 18 Oct 2026): Supabase's built-in mailer allows only a few emails an hour ("email rate limit exceeded"). Dev first, live before the waitlist (Nov 1) and beta: verify playiknowball.com in Resend (DNS in Cloudflare), then Supabase > Authentication > Emails > SMTP (smtp.resend.com, port 465, user `resend`, API key as password, sender noreply@playiknowball.com), then raise the limit under Rate Limits.
