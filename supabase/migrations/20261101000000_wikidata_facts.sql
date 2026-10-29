-- Template build B (Collins, 29 Oct 2026): facts the Daily's next templates
-- need, all from Wikidata. players.nationality already exists and is filled
-- now (the country they play for, else a citizenship). Shirt numbers were left
-- out: Wikidata has them on 1 in 400 spells.

alter table public.players
  add column height_cm smallint check (height_cm between 150 and 215),
  -- Senior clubs on their Wikidata record, loans included; national and youth sides don't count.
  add column career_clubs smallint check (career_clubs > 0);

-- The club's ground now and how many it holds.
alter table public.clubs
  add column ground text,
  add column ground_capacity int check (ground_capacity > 0);

-- Head coaches in the Premier League era, from each club's own list (P286).
create table public.club_managers (
  id           bigint generated always as identity primary key,
  club_id      bigint not null references public.clubs(id) on delete cascade,
  wikidata_qid text not null,
  name         text not null,
  started_on   date,
  ended_on     date,
  source_ref   text not null unique,       -- the Wikidata statement id
  updated_at   timestamptz not null default now()
);
create index club_managers_club_idx on public.club_managers(club_id);

-- No client policy: Daily answers are built from these rows.
alter table public.club_managers enable row level security;

-- club_spells as before, plus nationality, height and career clubs, so the
-- templates get all of a club's players in one paged read. A new column in
-- the result means drop and create.
drop function if exists public.club_spells(bigint);
create function public.club_spells(p_club bigint)
returns table (
  player_id bigint, known_as text, sitelinks int, date_of_birth date, joined_on date, left_on date, on_loan boolean, aliases text[],
  nationality text, height_cm smallint, career_clubs smallint
)
language sql stable set search_path = public as $$
  select p.id, p.known_as, p.sitelinks, p.date_of_birth, s.joined_on, s.left_on, s.on_loan,
         array(select a.alias from player_aliases a where a.player_id = p.id),
         p.nationality, p.height_cm, p.career_clubs
  from pl_era_spells s
  join players p on p.id = s.player_id
  where s.club_id = p_club
  order by p.id, s.joined_on
$$;

revoke execute on function public.club_spells(bigint) from public, anon, authenticated;
grant execute on function public.club_spells(bigint) to service_role;
