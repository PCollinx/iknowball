# iKnowBall

Knowledge-first football app: The Daily, The League and rankings. Next.js (App Router, TypeScript) on Vercel, Supabase for Postgres, auth and scheduled jobs.

## Run locally

You need Node and Docker Desktop. The app runs against a local Supabase, so nothing touches the live database.

First time:

```bash
npm install
npx supabase start          # needs Docker Desktop running
npx supabase db reset       # applies migrations and loads supabase/seed.sql (a sample Daily for today)
npx supabase status -o env  # prints the local URL and keys
```

Create `.env.local` from that output:

| `.env.local` | from `supabase status -o env` |
| :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | `API_URL` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `ANON_KEY` |
| `SUPABASE_SERVICE_ROLE_KEY` | `SERVICE_ROLE_KEY` |

Also set `NEXT_PUBLIC_SITE_URL=http://localhost:3000`, `HIGHLIGHTLY_API_KEY` (any placeholder works locally) and a `CRON_SECRET` of at least 16 characters (`openssl rand -hex 32`). Then:

```bash
npm run dev                 # http://localhost:3000/daily
```

Stop: Ctrl+C on `npm run dev`, then `npx supabase stop` (local data is kept).

Start again: open Docker Desktop, `npx supabase start`, `npm run dev`.

The sample Daily is dated the day you ran `npx supabase db reset`. On a later day `/daily` shows "No Daily today" until you reset again, which also wipes local attempts.

`/api/health` reports which settings are present and whether the database answers.

## Database

The schema lives in `supabase/migrations/`. To apply it to the hosted project, always link first: `db push` goes to whichever project was linked last. The project ref is the part of the live `NEXT_PUBLIC_SUPABASE_URL` (in Vercel) before `.supabase.co`.

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase migration list   # new migrations show as local only
npx supabase db push
npm run db:types            # regenerate TypeScript types after a schema change
```

## Checks

```bash
npm test          # unit tests (game clock, later answer matching and scoring)
npm run typecheck
npm run lint
```

## House rules

- Players never trigger a football API call. Scheduled jobs fetch from Highlightly into our database; screens read from the database.
- The quiz timer starts on the server and answers are checked on the server. The answer key (`daily_answers`, `player_aliases`) has no client read policy.
- The Daily closes at midnight GMT+1, all year. Matchweeks run Monday to Sunday on the same clock (`src/lib/time.ts`, `public.game_date()`).
- The domain lives only in `NEXT_PUBLIC_SITE_URL`.

## When the live site errors

Production hides server errors (for example "Minified React error #441"). To find the real one:

1. Open Sentry > Issues (or Vercel > Logs) and read the first line of the error.
2. Check `/api/health`.
3. A missing or invalid server variable (`SUPABASE_SERVICE_ROLE_KEY`, `HIGHLIGHTLY_API_KEY`, or a `CRON_SECRET` under 16 characters) breaks every page that uses the service role, including `/daily`. Fix it in Vercel, then redeploy.
4. "column ... does not exist" means a migration hasn't reached the live database: link the live project ref and `npx supabase db push`. No redeploy needed.
