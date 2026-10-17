-- Profiles and favourite club (decided 16 Oct 2026).
--
-- The favourite club only dresses your shirt, feeds the fanbase table and
-- tags matchdays; it never changes questions, scores or rating. It is asked
-- once, after your first Daily, and can be skipped. Switching clubs is allowed
-- once a season, so nobody hops clubs to climb the fanbase table.

-- ---------------------------------------------------------------------------
-- Seasons
-- ---------------------------------------------------------------------------

-- The season a game date belongs to: 2026 = 2026/27. Seasons turn over on
-- 1 July (game clock), between the last round and pre-season. Mirrors
-- seasonOf() in src/lib/time.ts.
create or replace function public.game_season(at timestamptz default now())
returns smallint language sql stable as $$
  select (extract(year from public.game_date(at))
          - case when extract(month from public.game_date(at)) < 7 then 1 else 0 end)::smallint
$$;

-- ---------------------------------------------------------------------------
-- The clubs you can support
-- ---------------------------------------------------------------------------

-- short_name becomes the club's stable key, so the supporter list, the
-- Wikidata importer and later the fixture sync all land on the same row.
alter table public.clubs add constraint clubs_short_name_key unique (short_name);

-- Shown in "Who do you support?": the Premier League clubs plus a few big
-- clubs abroad that plenty of fans in Nigeria follow.
alter table public.clubs add column fan_pick boolean not null default false;

-- Colours are club-inspired, never crests. Change them in the dashboard when a
-- kit looks wrong; promotion and relegation flip in_premier_league.
insert into public.clubs (name, short_name, shirt_colour, number_colour, trim_colour, in_premier_league, fan_pick)
values
  ('Arsenal',           'ARS', '#EF0107', '#FFFFFF', '#FFFFFF', true,  true),
  ('Aston Villa',       'AVL', '#670E36', '#FFFFFF', '#95BFE5', true,  true),
  ('Bournemouth',       'BOU', '#DA291C', '#FFFFFF', '#000000', true,  true),
  ('Brentford',         'BRE', '#E30613', '#FFFFFF', '#FFFFFF', true,  true),
  ('Brighton',          'BHA', '#0057B8', '#FFFFFF', '#FFFFFF', true,  true),
  ('Burnley',           'BUR', '#6C1D45', '#FFFFFF', '#99D6EA', true,  true),
  ('Chelsea',           'CHE', '#034694', '#FFFFFF', '#FFFFFF', true,  true),
  ('Crystal Palace',    'CRY', '#1B458F', '#FFFFFF', '#C4122E', true,  true),
  ('Everton',           'EVE', '#003399', '#FFFFFF', '#FFFFFF', true,  true),
  ('Fulham',            'FUL', '#FFFFFF', '#000000', '#000000', true,  true),
  ('Leeds',             'LEE', '#FFFFFF', '#1D428A', '#FFCD00', true,  true),
  ('Liverpool',         'LIV', '#C8102E', '#FFFFFF', '#FFFFFF', true,  true),
  ('Man City',          'MCI', '#6CABDD', '#FFFFFF', '#1C2C5B', true,  true),
  ('Man United',        'MUN', '#DA291C', '#FFFFFF', '#000000', true,  true),
  ('Newcastle',         'NEW', '#241F20', '#FFFFFF', '#FFFFFF', true,  true),
  ('Nottingham Forest', 'NFO', '#DD0000', '#FFFFFF', '#FFFFFF', true,  true),
  ('Sunderland',        'SUN', '#EB172B', '#FFFFFF', '#FFFFFF', true,  true),
  ('Spurs',             'TOT', '#FFFFFF', '#132257', '#132257', true,  true),
  ('West Ham',          'WHU', '#7A263A', '#FFFFFF', '#1BB1E7', true,  true),
  ('Wolves',            'WOL', '#FDB913', '#231F20', '#231F20', true,  true),
  ('Barcelona',         'BAR', '#A50044', '#EDBB00', '#004D98', false, true),
  ('Real Madrid',       'RMA', '#FFFFFF', '#00529F', '#FEBE10', false, true),
  ('Bayern Munich',     'BAY', '#DC052D', '#FFFFFF', '#0066B2', false, true),
  ('PSG',               'PSG', '#004170', '#FFFFFF', '#DA291C', false, true),
  ('Juventus',          'JUV', '#111111', '#FFFFFF', '#FFFFFF', false, true),
  ('AC Milan',          'MIL', '#FB090B', '#FFFFFF', '#000000', false, true)
on conflict (short_name) do update set
  shirt_colour      = excluded.shirt_colour,
  number_colour     = excluded.number_colour,
  trim_colour       = excluded.trim_colour,
  in_premier_league = excluded.in_premier_league,
  fan_pick          = true;

-- Former Premier League clubs the importer tracks for player histories.
update public.clubs set in_premier_league = false where not fan_pick;

-- ---------------------------------------------------------------------------
-- Profile columns
-- ---------------------------------------------------------------------------

alter table public.profiles
  -- When "Who do you support?" was answered or skipped; it is asked only once.
  add column club_asked_at timestamptz,
  -- The season (2026 = 2026/27) the player last switched club. Set only by the
  -- trigger below, never by the player.
  add column club_switched_season smallint;

-- The once-a-season rule, enforced here so no client can skip it. Picking a
-- club when you have none is free; changing or dropping one is the season's
-- switch. Dropping to neutral and picking again in the same season is blocked.
create or replace function public.guard_favourite_club()
returns trigger language plpgsql set search_path = public as $$
declare
  season smallint := public.game_season();
begin
  if new.favourite_club_id is not distinct from old.favourite_club_id then
    new.club_switched_season := old.club_switched_season;
    return new;
  end if;

  if new.favourite_club_id is not null
     and not exists (select 1 from clubs where id = new.favourite_club_id and fan_pick) then
    raise exception 'That club isn''t on the list.' using errcode = 'check_violation';
  end if;

  if old.club_switched_season = season then
    raise exception 'You''ve already switched club this season.' using errcode = 'check_violation';
  end if;

  new.club_switched_season := case when old.favourite_club_id is null then old.club_switched_season else season end;
  return new;
end $$;

create trigger profiles_guard_favourite_club
  before update on public.profiles
  for each row execute function public.guard_favourite_club();

-- The fanbase table will group by club.
create index profiles_favourite_club_idx on public.profiles(favourite_club_id);
