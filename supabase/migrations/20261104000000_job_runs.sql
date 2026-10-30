-- The control room (Collins, 30 Oct 2026): every run of a scheduled job, so
-- the maker can see what ran overnight, what went wrong and what never
-- finished. Written by the service role only.

create table public.job_runs (
  id          bigint generated always as identity primary key,
  job         text not null check (job in ('fixtures', 'match-data', 'import-wikidata', 'drafts')),
  trigger     text not null default 'cron' check (trigger in ('cron', 'manual')),
  started_at  timestamptz not null default now(),
  finished_at timestamptz,
  -- running until it finishes; a run the platform cut off stays running until
  -- the next check marks it failed.
  status      text not null default 'running' check (status in ('running', 'ok', 'warning', 'failed')),
  summary     jsonb,
  problems    text[] not null default '{}'
);

create index job_runs_job_started on public.job_runs (job, started_at desc);

alter table public.job_runs enable row level security;
