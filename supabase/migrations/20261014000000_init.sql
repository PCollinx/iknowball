-- iKnowBall initial schema (draft, Oct 2026)
--
-- Rules this schema enforces:
--   * Players never see the answer key: daily_answers has no client policies.
--   * Attempts and scores are written by the server (service role) only.
--   * The Daily closes at midnight GMT+1; matchweeks run Monday to Sunday on
--     that clock, so a midweek Premier League round sits inside its week.
--   * Football data comes from scheduled jobs (Highlightly), never from players.

create extension if not exists pg_trgm;
create extension if not exists unaccent;

-- ---------------------------------------------------------------------------
-- Game clock
-- ---------------------------------------------------------------------------

-- Today's Daily date. Fixed GMT+1 (West Africa Time has no daylight saving).
create or replace function public.game_date(at timestamptz default now())
returns date language sql stable as $$
  select (at at time zone 'Africa/Lagos')::date
$$;

-- Lowercase, strip accents and punctuation, collapse spaces. Answer matching
-- runs on this form; the app adds typo tolerance on top.
create or replace function public.normalize_name(input text)
returns text language sql immutable as $$
  select trim(regexp_replace(
    regexp_replace(lower(public.unaccent('public.unaccent'::regdictionary, input)), '[^a-z0-9 ]', ' ', 'g'),
    '\s+', ' ', 'g'))
$$;

-- ---------------------------------------------------------------------------
-- Football reference data (synced by jobs, readable by everyone)
-- ---------------------------------------------------------------------------

create table public.clubs (
  id               bigint generated always as identity primary key,
  name             text not null,
  short_name       text not null,
  highlightly_team_id bigint unique,
  -- Shirt-back card colours (club-inspired, no crests)
  shirt_colour     text not null default '#222222',
  number_colour    text not null default '#ffffff',
  trim_colour      text,
  in_premier_league boolean not null default true,
  created_at       timestamptz not null default now()
);

create table public.players (
  id               bigint generated always as identity primary key,
  full_name        text not null,
  known_as         text not null,             -- name printed on the shirt-back card
  highlightly_player_id bigint unique,
  wikidata_qid     text unique,
  position         text check (position in ('GK','DEF','MID','FWD')),
  shirt_number     smallint,
  current_club_id  bigint references public.clubs(id),
  nationality      text,
  date_of_birth    date,
  is_legend        boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index players_current_club_idx on public.players(current_club_id);

create table public.player_aliases (
  id               bigint generated always as identity primary key,
  player_id        bigint not null references public.players(id) on delete cascade,
  alias            text not null,             -- e.g. 'Vini Jr', 'Vinícius Júnior'
  alias_normalized text generated always as (public.normalize_name(alias)) stored,
  unique (player_id, alias_normalized)
);
create index player_aliases_trgm_idx on public.player_aliases using gin (alias_normalized gin_trgm_ops);

-- Monday to Sunday, GMT+1. A week with a midweek round simply has more fixtures.
create table public.matchweeks (
  id               bigint generated always as identity primary key,
  season           smallint not null,         -- 2026 = 2026/27
  starts_on        date not null unique check (extract(isodow from starts_on) = 1),
  ends_on          date generated always as (starts_on + 6) stored,
  is_international_break boolean not null default false,
  locked_at        timestamptz                -- set when the week's tables are final
);

create table public.fixtures (
  id               bigint generated always as identity primary key,
  highlightly_match_id bigint unique,
  season           smallint not null,
  pl_round         smallint,                  -- Premier League gameweek number; not our matchweek
  kickoff_at       timestamptz not null,
  matchweek_id     bigint references public.matchweeks(id),
  home_club_id     bigint not null references public.clubs(id),
  away_club_id     bigint not null references public.clubs(id),
  status           text not null default 'scheduled'
                   check (status in ('scheduled','live','finished','postponed','cancelled')),
  home_score       smallint,
  away_score       smallint,
  is_midweek       boolean generated always as
                   (extract(isodow from (kickoff_at at time zone 'Africa/Lagos')) between 2 and 4) stored,
  updated_at       timestamptz not null default now()
);
create index fixtures_kickoff_idx on public.fixtures(kickoff_at);
create index fixtures_matchweek_idx on public.fixtures(matchweek_id);

-- Per-player box score from Highlightly /box-score/{matchId}. Season totals
-- (dribbles, key passes, duels) are summed from here, not fetched.
create table public.player_match_stats (
  fixture_id       bigint not null references public.fixtures(id) on delete cascade,
  player_id        bigint not null references public.players(id) on delete cascade,
  club_id          bigint references public.clubs(id),
  minutes          smallint,
  goals            smallint,
  assists          smallint,
  shots            smallint,
  key_passes       smallint,
  dribbles_total   smallint,
  dribbles_successful smallint,
  duels_total      smallint,
  duels_won        smallint,
  tackles          smallint,
  interceptions    smallint,
  xg               numeric(5,2),
  xa               numeric(5,2),
  match_rating     numeric(4,2),
  raw              jsonb,                     -- untouched source row, for fields we add later
  primary key (fixture_id, player_id)
);
create index player_match_stats_player_idx on public.player_match_stats(player_id);

create view public.player_season_totals as
select s.player_id, f.season,
       count(*)                  as appearances,
       sum(s.minutes)            as minutes,
       sum(s.goals)              as goals,
       sum(s.assists)            as assists,
       sum(s.key_passes)         as key_passes,
       sum(s.dribbles_successful) as dribbles_successful,
       sum(s.duels_won)          as duels_won,
       sum(s.tackles)            as tackles,
       sum(s.interceptions)      as interceptions,
       sum(s.xg)                 as xg,
       sum(s.xa)                 as xa
from public.player_match_stats s
join public.fixtures f on f.id = s.fixture_id
group by s.player_id, f.season;

-- Every outbound data-API call, so jobs can stay inside the free 100/day.
create table public.api_calls (
  id               bigint generated always as identity primary key,
  source           text not null default 'highlightly',
  endpoint         text not null,
  status_code      smallint,
  called_at        timestamptz not null default now()
);
create index api_calls_day_idx on public.api_calls(source, called_at);

-- ---------------------------------------------------------------------------
-- Players of the game (people)
-- ---------------------------------------------------------------------------

-- One row per auth user, guests included (Supabase anonymous sign-in).
create table public.profiles (
  id               uuid primary key references auth.users(id) on delete cascade,
  username         text unique check (username ~ '^[A-Za-z0-9_]{3,20}$'),
  display_name     text,
  country          text,                      -- ISO 3166-1 alpha-2, e.g. 'NG', 'GB'
  favourite_club_id bigint references public.clubs(id),
  is_admin         boolean not null default false,
  created_at       timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create table public.ratings (
  user_id          uuid primary key references public.profiles(id) on delete cascade,
  rating           integer not null default 1000,
  tier             text not null default 'unranked',  -- tier names still open
  updated_at       timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- The Daily
-- ---------------------------------------------------------------------------

create table public.dailies (
  id               bigint generated always as identity primary key,
  play_date        date not null unique,       -- game_date() it is live on
  format           text not null check (format in ('free_recall','in_order')),
  title            text not null,
  prompt           text not null,
  theme_fixture_id bigint references public.fixtures(id),
  time_limit_seconds smallint not null default 90 check (time_limit_seconds between 10 and 600),
  answer_count     smallint not null,          -- shown to players ("name all 11")
  status           text not null default 'draft' check (status in ('draft','scheduled')),
  source_note      text,                       -- where the answer was checked
  checked_by       uuid references public.profiles(id),
  created_at       timestamptz not null default now()
);

-- The answer key. No client policies: only the service role reads it.
create table public.daily_answers (
  id               bigint generated always as identity primary key,
  daily_id         bigint not null references public.dailies(id) on delete cascade,
  position         smallint,                   -- order for In Order; null for Free Recall
  player_id        bigint references public.players(id),  -- matched through aliases
  answer_text      text not null,              -- display text, and the match target when not a player
  extra_aliases    text[] not null default '{}',
  unique (daily_id, position)
);

create table public.attempts (
  id               bigint generated always as identity primary key,
  daily_id         bigint not null references public.dailies(id) on delete cascade,
  user_id          uuid not null references public.profiles(id) on delete cascade,
  started_at       timestamptz not null default now(),   -- server clock starts here
  deadline_at      timestamptz not null,
  submitted_at     timestamptz,
  correct_count    smallint not null default 0,
  score            integer not null default 0,
  unique (daily_id, user_id)                   -- one try per Daily
);
create index attempts_user_idx on public.attempts(user_id);

create table public.attempt_guesses (
  id               bigint generated always as identity primary key,
  attempt_id       bigint not null references public.attempts(id) on delete cascade,
  raw_input        text not null,
  answer_id        bigint references public.daily_answers(id),  -- null when wrong
  received_at      timestamptz not null default now()
);
create index attempt_guesses_attempt_idx on public.attempt_guesses(attempt_id);

-- Answers players reported as wrongly marked.
create table public.answer_reports (
  id               bigint generated always as identity primary key,
  attempt_guess_id bigint not null references public.attempt_guesses(id) on delete cascade,
  user_id          uuid not null references public.profiles(id) on delete cascade,
  note             text,
  resolved         boolean not null default false,
  created_at       timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- The League
-- ---------------------------------------------------------------------------

create table public.leagues (
  id               bigint generated always as identity primary key,
  name             text not null check (char_length(name) between 2 and 40),
  invite_code      text not null unique default upper(substr(md5(random()::text), 1, 6)),
  owner_id         uuid not null references public.profiles(id),
  created_at       timestamptz not null default now()
);

create table public.league_members (
  league_id        bigint not null references public.leagues(id) on delete cascade,
  user_id          uuid not null references public.profiles(id) on delete cascade,
  joined_at        timestamptz not null default now(),
  primary key (league_id, user_id)
);
create index league_members_user_idx on public.league_members(user_id);

-- Points per player per matchweek. League tables and the global weekly table
-- read from here; the scoring formula is still open.
create table public.matchweek_scores (
  matchweek_id     bigint not null references public.matchweeks(id) on delete cascade,
  user_id          uuid not null references public.profiles(id) on delete cascade,
  points           integer not null default 0,
  dailies_played   smallint not null default 0,
  updated_at       timestamptz not null default now(),
  primary key (matchweek_id, user_id)
);
create index matchweek_scores_points_idx on public.matchweek_scores(matchweek_id, points desc);

-- ---------------------------------------------------------------------------
-- Waitlist (live Nov 1)
-- ---------------------------------------------------------------------------

create table public.waitlist (
  id               bigint generated always as identity primary key,
  email            text not null unique,
  name             text,
  favourite_club   text,
  league_name      text,
  mates_count      smallint check (mates_count between 0 and 100),
  created_at       timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------

alter table public.clubs              enable row level security;
alter table public.players            enable row level security;
alter table public.player_aliases     enable row level security;
alter table public.matchweeks         enable row level security;
alter table public.fixtures           enable row level security;
alter table public.player_match_stats enable row level security;
alter table public.api_calls          enable row level security;
alter table public.profiles           enable row level security;
alter table public.ratings            enable row level security;
alter table public.dailies            enable row level security;
alter table public.daily_answers      enable row level security;
alter table public.attempts           enable row level security;
alter table public.attempt_guesses    enable row level security;
alter table public.answer_reports     enable row level security;
alter table public.leagues            enable row level security;
alter table public.league_members     enable row level security;
alter table public.matchweek_scores   enable row level security;
alter table public.waitlist           enable row level security;

-- Views run with the caller's rights so RLS on the base tables applies.
alter view public.player_season_totals set (security_invoker = true);

-- Public reference data
create policy "read clubs"      on public.clubs              for select using (true);
create policy "read players"    on public.players            for select using (true);
create policy "read matchweeks" on public.matchweeks         for select using (true);
create policy "read fixtures"   on public.fixtures           for select using (true);
create policy "read stats"      on public.player_match_stats for select using (true);
-- player_aliases: no client policy, or the alias list would leak answers.

-- Profiles and ratings are public (leaderboards); you edit only your own profile.
create policy "read profiles" on public.profiles for select using (true);
create policy "update own profile" on public.profiles for update
  using (auth.uid() = id) with check (auth.uid() = id and is_admin = false);
create policy "read ratings" on public.ratings for select using (true);

-- Dailies: today's and past ones only, never future ones.
create policy "read live dailies" on public.dailies for select
  using (status = 'scheduled' and play_date <= public.game_date());

-- Attempts: you see your own; others' totals come through the leaderboard view.
create policy "read own attempts" on public.attempts for select using (auth.uid() = user_id);
create policy "read own guesses" on public.attempt_guesses for select
  using (exists (select 1 from public.attempts a where a.id = attempt_id and a.user_id = auth.uid()));
create policy "report own guess" on public.answer_reports for insert
  with check (auth.uid() = user_id);

-- Leagues: members see their league, its members and its scores.
create or replace function public.is_league_member(l bigint)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.league_members where league_id = l and user_id = auth.uid())
$$;

create policy "members read league" on public.leagues for select
  using (public.is_league_member(id) or owner_id = auth.uid());
create policy "members read members" on public.league_members for select
  using (public.is_league_member(league_id));
create policy "read matchweek scores" on public.matchweek_scores for select using (true);
-- Creating and joining leagues go through server actions (invite-code check).

-- Waitlist: anyone can sign up, nobody can read it from the client.
create policy "join waitlist" on public.waitlist for insert with check (true);

-- Daily leaderboard without exposing attempt internals.
create view public.daily_leaderboard
with (security_invoker = false) as
select a.daily_id, a.user_id, p.username, p.display_name, p.country,
       a.score, a.correct_count, a.submitted_at - a.started_at as time_taken
from public.attempts a
join public.profiles p on p.id = a.user_id
where a.submitted_at is not null;
grant select on public.daily_leaderboard to anon, authenticated;
