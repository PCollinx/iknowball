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

## The Daily maker

`/maker` is the back office for writing Dailies: a list of the coming weeks, and an editor for each day's two parts with a live shirt preview and a "try a guess" box that uses the real answer matching. A part locks once anyone has started it.

Answer boxes take one answer per line:

```text
Part 1, Free Recall:   Cesc Fàbregas | Cesc, Fabregas      (aliases after the bar)
Part 2, In Order:      Emmanuel Petit | 2001               (correct order, top first; the reveal after the bar)
```

Locally, `npx supabase db reset` creates an admin: `admin@iknowball.local`, password `ball-knowledge`.

On the live project, once:

1. Supabase > Authentication > Users > Add user, with your email and a strong password, and tick "Auto confirm".
2. Supabase > SQL editor:
   ```sql
   update public.profiles set is_admin = true
   where id = (select id from auth.users where email = 'you@example.com');
   ```
3. Sign in at `/maker/login`.

## Auto-drafted Dailies

Nobody writes a Daily from scratch. Two scheduled jobs (in `vercel.json`) do it, and a person reviews once a week in the maker:

- **`/api/jobs/import-wikidata`**, Mondays 04:00 WAT: pulls every player who has played for the 30 clubs in `src/lib/drafts/clubs.ts` from Wikidata (CC0), with their club spells, dates and nicknames, into `players`, `player_aliases` and `player_spells`. `?club=Arsenal F.C.` imports one club (the English Wikipedia title).
- **`/api/jobs/drafts`**, daily 20:00 WAT: fills every empty day in the next 8 with a draft. Part 1 is "players who've played for both X and Y since 1992", preferring that week's fixtures and never repeating a pair within 90 days. Part 2 orders five of them by the year they joined. Then any day starting tomorrow that is still a draft gets scheduled, so no day goes empty.

Drafts show in `/maker` with a teal **Auto** tag. Check them, fix what Wikidata got wrong (missed loans, odd dates), and press Schedule.

On the live project, once, after pushing the migration:

```sh
curl -H "Authorization: Bearer $CRON_SECRET" https://playiknowball.com/api/jobs/import-wikidata
curl -H "Authorization: Bearer $CRON_SECRET" https://playiknowball.com/api/jobs/drafts
```

If the import runs out of time, run it per club with `?club=...`; it is safe to re-run.

Locally, point the import at a stand-in with `WIKIDATA_SPARQL_URL` in `.env.local`, or leave it unset to use the real Wikidata.

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
