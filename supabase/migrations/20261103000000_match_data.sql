-- Template build D (Collins, 30 Oct 2026): what happens in matches, from
-- Highlightly, for the Daily's matchday templates and fixture history. A
-- nightly job (/api/jobs/match-data) fills it; players never trigger a call.
-- Premier League only for box scores; fixture history is the last 10 meetings
-- of each pair we use (Highlightly's head-to-head), then every new match.

-- When a finished fixture's events (and, this season, its box score) were fetched.
alter table public.fixtures add column details_synced_at timestamptz;
create index fixtures_details_todo_idx on public.fixtures(kickoff_at) where status = 'finished' and details_synced_at is null;

-- The box score's extras: whether he started, where he played, his cards.
alter table public.player_match_stats
  add column started boolean,
  add column position text check (position in ('GK','DEF','MID','FWD')),
  add column shirt_number smallint,
  add column yellow_cards smallint,
  add column red_cards smallint;
create index player_match_stats_club_idx on public.player_match_stats(club_id);

-- Goals, own goals, penalties and cards, from /matches/{id}. A player we
-- couldn't match keeps his name with no player_id.
create table public.match_events (
  fixture_id       bigint not null references public.fixtures(id) on delete cascade,
  seq              smallint not null,              -- order in the match
  minute           text not null,                  -- "45+1"
  type             text not null check (type in ('goal', 'own-goal', 'penalty', 'missed-penalty', 'yellow', 'red')),
  club_id          bigint references public.clubs(id),
  player_id        bigint references public.players(id) on delete set null,
  player_name      text not null,
  assist_player_id bigint references public.players(id) on delete set null,
  assist_name      text,
  primary key (fixture_id, seq)
);
create index match_events_player_idx on public.match_events(player_id);

-- The Premier League table as it stands, from /standings, one row a club.
create table public.league_table (
  season        smallint not null,
  position      smallint not null check (position between 1 and 24),
  club_id       bigint not null references public.clubs(id),
  played        smallint not null,
  won           smallint not null,
  drawn         smallint not null,
  lost          smallint not null,
  goals_for     smallint not null,
  goals_against smallint not null,
  points        smallint not null,
  updated_at    timestamptz not null default now(),
  primary key (season, club_id)
);

-- Pairs whose last 10 meetings were fetched, lower club id first.
create table public.pair_history (
  club_a    bigint not null references public.clubs(id) on delete cascade,
  club_b    bigint not null references public.clubs(id) on delete cascade,
  synced_at timestamptz not null default now(),
  primary key (club_a, club_b),
  check (club_a < club_b)
);

-- No client policy: Daily answers are built from these rows.
alter table public.match_events enable row level security;
alter table public.league_table enable row level security;
alter table public.pair_history enable row level security;
