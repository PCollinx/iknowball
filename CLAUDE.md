@AGENTS.md

# iKnowBall

Project memory for Claude Code, carried over from the Claude project where the plan was made (Oct 2026). Owner: Collins (GitHub `PCollinx`). Keep this file current: when a decision is made or an open item closes, update it here.

## Product

- Name: **iKnowBall** (short form IKB, never "YKB"). Domain **playiknowball.com**. The domain lives only in `NEXT_PUBLIC_SITE_URL`; if it ever moves (e.g. to iknowball.com, which may be bought later), the old one must redirect forever.
- A knowledge-first football app: one rating with tiers. Nigeria-first, plus UK and global football Twitter. Tone is confident banter, not British nostalgia. Inspired by futoteca.club.
- Three pillars:
  - **The Daily**: one try per day, Free Recall and In Order formats, timed, themed on the Premier League fixtures.
  - **Clash**: 60-second duels (Higher/Lower facts, skill-specific player comparisons, crowd vs data). At launch: solo sprint plus async challenge links. Rate mode feeds the vote pool (about 100 votes for a comparison to enter play).
  - **The League**: mini-leagues with invite codes, scored per PL matchweek (Mon to Sun), plus a global weekly table and an all-time rating.
  - Predictions come after launch.
- Web app first, mobile-first, with its own desktop layout from about 1024px.
- No Premier League branding or club crests. Player cards are code-generated shirt-back cards, never faces.

## Look and type (chosen 15 Oct 2026)

- Theme **Royal and Teal**. Tokens live in `src/app/globals.css` (Tailwind: `text-royal`, `bg-teal`, `bg-mist`, and so on).
- The background is **always white** (#FFFFFF): no dark theme. Navy `#0C1330` is the text colour.
- Royal blue `#1F48D6` leads: shirts, correct answers, the answer box. Teal `#00A3A3` is the countdown (bar and tab), tier badge and highlights; light teal `#7FE3E0` for shirt numbers. Mist `#EEF2FB` fills, track `#DCE3F5`, red card `#D7263D` for banter and warnings. Pitch green and yellow were tried and rejected.
- Type: **Big Shoulders** 900 (`font-display`, uppercase) for headings, numbers and shirt names; **Barlow** 400 and 600 (`font-sans`) for everything else. Both self-hosted by `next/font` in `src/app/layout.tsx`.
- This settles colours and fonts only. Screen layouts are designed screen by screen in the core build, starting with The Daily.
- Picker page with all rounds: https://claude.ai/artifact/99Qnj4Vm79G3JeDY24KUTp

## Data

- **Primary source: Highlightly, free plan** (commercial use confirmed by Collins, 13 Oct 2026). Base URL `https://soccer.highlightly.net`, header `x-rapidapi-key`, 100 requests/day free (paid from $9.49/mo for 7,500/day). 2026/27 PL is league id `33973`, `season=2026`.
  - `/box-score/{matchId}` gives per-player duels won, key passes, successful dribbles, interceptions, tackles, shots, xG, xA and a match rating.
  - Season totals for those stats are not in `/players/{id}/statistics`: aggregate box scores in our database (about 10 calls per matchweek).
  - `/matches` lists newest first. Lineups are only served from 40 min before to 120 min after kickoff, so fetch them on match day.
- Fallback: API-Football Pro ($19/mo). Its free plan blocks the current season.
- Also usable: Wikidata (CC0) for player facts, football-data.org as a backup.
- Ruled out: FBref, scraping FotMob/Understat/Transfermarkt, StatsBomb open data, the unofficial FPL API as a core source.

## Stack

- Next.js 16.4 App Router + TypeScript on Vercel (read `node_modules/next/dist/docs/` before writing Next code; see AGENTS.md). Tailwind 4 via the Turbopack loader. Next 16 notes: middleware is `src/proxy.ts`; `cacheComponents` is on, so don't use `export const dynamic`. ESLint stays on 9 until eslint-config-next supports 10.
- Supabase: Postgres, guest auth (anonymous sign-in; a trigger creates the `profiles` row), RLS, cron. Clients in `src/lib/supabase/` (`client.ts` browser, `server.ts` server, `admin.ts` service role, server only). Schema in `supabase/migrations/`; regenerate types with `npm run db:types`.
- Env vars validated with zod in `src/lib/env.ts`; the full list is in `.env.example`.
- PostHog (EU) in `src/instrumentation-client.ts`, lazy-loaded on idle and proxied through `/ingest`. Sentry (`@sentry/nextjs` 11, org `collins-sb`, project `iknowball`) lazy-loaded on idle with an early-error buffer, tunnel route `/monitoring`. First-load JS budget about 200 KB gzipped (currently about 176 KB): keep heavy libraries off the first load.
- Later: server-rendered share-card images, PWA, Expo for native.
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

## Timeline

- Oct 14 to 18: setup (done 15 Oct: domain, Supabase schema, PostHog and Sentry live).
- Oct 19 to Nov 8: core build. Nov 9 to 15: leagues. Nov 16 to 25: closed beta.
- **Launch Fri 27 Nov 2026** (fallback 4 Dec). Demo video recorded in the beta, published Thu 26 Nov on X and WhatsApp, pinned on the waitlist page.
- Clash and Rate mode: 18 Dec 2026. Native decision: 1 Mar 2027. Android: July 2027.

## Open items

- Tier names.
- Matchweek scoring formula.
- Whether to buy iknowball.com.
- Switch Vercel to Pro ($20/mo) before launch: Hobby is non-commercial only.
