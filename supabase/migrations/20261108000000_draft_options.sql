-- Draft options (Collins, 4 Nov 2026): when the drafts job writes a day, it
-- also keeps every other template that filled for the day's clubs, so the
-- maker can swap a part for one of them instead of writing one on the spot.
-- One row a day; each part is a list of parts as maker_save_day takes them.
-- They hold answers, so no client policy: the service role only.

create table public.draft_options (
  play_date date primary key,
  part1 jsonb not null default '[]',
  part2 jsonb not null default '[]',
  made_at timestamptz not null default now()
);

alter table public.draft_options enable row level security;
