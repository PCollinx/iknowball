-- Clash: the 60-second Higher or Lower sprint (built 19 Oct 2026).
-- A set is the chain of players for one sprint; its code is the challenge
-- link, so a mate plays the exact same set. A run is one player's go at a set,
-- timed on the server like a Daily attempt. Both tables hold the answers, so
-- neither has a client policy: everything goes through the service role.

create table public.clash_sets (
  id               bigint generated always as identity primary key,
  code             text not null unique check (code ~ '^[A-Z0-9]{6}$'),
  stat             text not null check (stat in ('goals', 'apps', 'sample')),
  -- [{ "name": "Alan Shearer", "club_id": 12, "value": 148 }, ...], played in order.
  items            jsonb not null check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) >= 2),
  created_by       uuid references public.profiles(id) on delete set null,
  created_at       timestamptz not null default now()
);

create table public.clash_runs (
  id               bigint generated always as identity primary key,
  set_id           bigint not null references public.clash_sets(id) on delete cascade,
  user_id          uuid not null references public.profiles(id) on delete cascade,
  started_at       timestamptz not null default now(),
  deadline_at      timestamptz not null,       -- moves 5 s earlier for each wrong answer
  submitted_at     timestamptz,
  answered         smallint not null default 0, -- also the index of the player on show
  right_count      smallint not null default 0,
  best_run         smallint not null default 0,
  current_run      smallint not null default 0,
  kicks            text not null default '' check (kicks ~ '^[01]*$'), -- 1 scored, 0 missed
  unique (set_id, user_id)                     -- one go at a set each
);
create index clash_runs_user_idx on public.clash_runs(user_id);

alter table public.clash_sets enable row level security;
alter table public.clash_runs enable row level security;

-- Players worth a Higher or Lower question for one stat: league goals or
-- appearances for a club, summed over their spells there, only where every
-- spell has the number (a missing spell would make the total wrong).
create or replace function public.clash_pool(p_stat text, p_min int, p_limit int)
returns table (player_name text, club_id bigint, value int)
language sql stable set search_path = public as $$
  select p.known_as, s.club_id, sum(case when p_stat = 'goals' then s.goals else s.apps end)::int
  from public.player_spells s
  join public.players p on p.id = s.player_id
  group by p.id, p.known_as, s.club_id
  having bool_and((case when p_stat = 'goals' then s.goals else s.apps end) is not null)
     and sum(case when p_stat = 'goals' then s.goals else s.apps end) >= p_min
  order by random()
  limit p_limit
$$;
revoke execute on function public.clash_pool(text, int, int) from public, anon, authenticated;
