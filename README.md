# iKnowBall

Knowledge-first football app: The Daily, The League and rankings. Next.js (App Router, TypeScript) on Vercel, Supabase for Postgres, auth and scheduled jobs.

## Run locally

```bash
npm install
cp .env.example .env.local   # fill in Supabase keys at least
npm run dev                  # http://localhost:3000
```

`/api/health` reports which settings are present and whether the database answers.

## Database

The schema lives in `supabase/migrations/`. To apply it to the hosted project:

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
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
