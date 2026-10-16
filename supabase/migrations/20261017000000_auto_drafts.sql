-- Auto-drafted Dailies: player club histories from Wikidata (CC0), and the
-- functions the draft job reads them through.

alter table public.clubs add column wikidata_qid text unique;

-- One row per Wikidata "member of sports team" statement for a club we track.
-- Dates come at whatever precision Wikidata holds (often just the year).
create table public.player_spells (
  id               bigint generated always as identity primary key,
  player_id        bigint not null references public.players(id) on delete cascade,
  club_id          bigint not null references public.clubs(id) on delete cascade,
  joined_on        date,
  left_on          date,
  source_ref       text not null unique,       -- the Wikidata statement id
  updated_at       timestamptz not null default now()
);
create index player_spells_club_idx on public.player_spells(club_id);
create index player_spells_player_idx on public.player_spells(player_id);

-- No client policy: the Daily's answers are built from these rows.
alter table public.player_spells enable row level security;

-- Spells that touch the Premier League era (from August 1992). A spell with no
-- dates at all can't be placed, so it is left out.
create or replace view public.pl_era_spells with (security_invoker = true) as
  select * from public.player_spells
  where coalesce(left_on, joined_on) is not null
    and coalesce(left_on, 'infinity'::date) >= date '1992-08-15';

-- How many players two clubs share in the Premier League era, for every pair.
create or replace function public.club_pair_overlaps()
returns table (club_a bigint, club_b bigint, players int)
language sql stable set search_path = public as $$
  select a.club_id, b.club_id, count(distinct a.player_id)::int
  from pl_era_spells a
  join pl_era_spells b on b.player_id = a.player_id and b.club_id > a.club_id
  group by a.club_id, b.club_id
$$;

-- The players two clubs share, with when each first joined either club.
create or replace function public.club_pair_players(p_a bigint, p_b bigint)
returns table (player_id bigint, known_as text, joined_a date, joined_b date)
language sql stable set search_path = public as $$
  select p.id, p.known_as, min(a.joined_on), min(b.joined_on)
  from pl_era_spells a
  join pl_era_spells b on b.player_id = a.player_id and b.club_id = p_b
  join players p on p.id = a.player_id
  where a.club_id = p_a
  group by p.id, p.known_as
$$;

revoke execute on function public.club_pair_overlaps() from public, anon, authenticated;
revoke execute on function public.club_pair_players(bigint, bigint) from public, anon, authenticated;
grant execute on function public.club_pair_overlaps() to service_role;
grant execute on function public.club_pair_players(bigint, bigint) to service_role;
