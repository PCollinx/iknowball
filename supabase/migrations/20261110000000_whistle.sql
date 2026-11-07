-- The whistle (Collins, 7 Nov 2026, options A, B and C of
-- https://claude.ai/artifact/AGqN4hg5iztkWXatKnGwab): push notifications for
-- the Daily (09:00 when it's up, 20:00 if you haven't played), Clash
-- challenges (the moment a mate finishes one of yours) and your league
-- (Mondays at 09:00, in place of that morning's Daily buzz).

-- One row a device: the browser's push subscription and what it wants.
create table public.push_subscriptions (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  daily       boolean not null default true,
  challenges  boolean not null default true,
  league      boolean not null default true,
  created_at  timestamptz not null default now()
);
create index push_subscriptions_user on public.push_subscriptions (user_id);

-- Each buzz goes to a player once: "daily-up" and "daily-closing" once a day,
-- a challenge once per mate per set, the league once a week.
create table public.push_sends (
  user_id  uuid not null references auth.users(id) on delete cascade,
  key      text not null,
  sent_at  timestamptz not null default now(),
  primary key (user_id, key)
);

-- Written and read by the service role only.
alter table public.push_subscriptions enable row level security;
alter table public.push_sends enable row level security;

alter table public.job_runs drop constraint job_runs_job_check;
alter table public.job_runs add constraint job_runs_job_check
  check (job in ('fixtures', 'match-data', 'import-wikidata', 'drafts', 'launch-email', 'whistle-morning', 'whistle-evening'));
