-- Clash's new stats (Collins, 31 Oct 2026, mocks at
-- https://claude.ai/artifact/V7SuwLBLP6oSZwyw7norBW): height, years at the
-- club and career clubs join league goals and games, one a weekday. The maker
-- can strike out a number that's wrong (clash_strikes), and every draw leaves
-- those out.

alter table public.clash_sets drop constraint clash_sets_stat_check;
alter table public.clash_sets add constraint clash_sets_stat_check
  check (stat in ('goals', 'apps', 'height', 'years', 'clubs', 'sample'));

-- A number struck out of Clash. Per club for goals, games and years; club null
-- for height and career clubs, which are the player's own. Kept through
-- re-imports, since they key on our player and club ids.
create table public.clash_strikes (
  id          bigint generated always as identity primary key,
  stat        text not null check (stat in ('goals', 'apps', 'height', 'years', 'clubs')),
  player_id   bigint not null references public.players(id) on delete cascade,
  club_id     bigint references public.clubs(id) on delete cascade,
  struck_by   uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  unique nulls not distinct (stat, player_id, club_id)
);
alter table public.clash_strikes enable row level security;

-- Everyone Clash could draw for a stat, with their fame and whether the maker
-- struck them. Goals and games are summed over a player's spells at a club,
-- only where every spell has the number; years at the club add up the
-- finished spells there, loans left out, only when none is still running.
-- Height and career clubs are the player's, shown in the kit of the top club
-- he played most for. `p_top` keeps to top clubs.
create or replace function public.clash_candidates(p_stat text, p_min int, p_top boolean)
returns table (player_id bigint, player_name text, club_id bigint, value int, sitelinks int, struck boolean)
language sql stable set search_path = public as $$
  with spells as (
    select s.player_id, s.club_id, s.apps, s.goals, s.joined_on, s.left_on, s.on_loan
    from public.player_spells s
    join public.clubs c on c.id = s.club_id
    where c.top or not p_top
  ),
  per_club as (
    select s.player_id, s.club_id,
      (case p_stat
        when 'goals' then case when bool_and(s.goals is not null) then sum(s.goals) end
        when 'apps' then case when bool_and(s.apps is not null) then sum(s.apps) end
        when 'years' then case when bool_and(s.joined_on is not null and s.left_on is not null) filter (where not s.on_loan)
                               then round(sum(s.left_on - s.joined_on) filter (where not s.on_loan) / 365.25) end
      end)::int as value
    from spells s
    where p_stat in ('goals', 'apps', 'years')
    group by s.player_id, s.club_id
  ),
  per_player as (
    select distinct on (s.player_id) s.player_id, s.club_id,
      (case p_stat when 'height' then p.height_cm when 'clubs' then p.career_clubs end)::int as value
    from spells s
    join public.players p on p.id = s.player_id
    where p_stat in ('height', 'clubs') and not s.on_loan
    order by s.player_id, s.apps desc nulls last, s.left_on desc nulls first
  ),
  found as (
    select * from per_club
    union all
    select * from per_player
  )
  select f.player_id, p.known_as, f.club_id, f.value, p.sitelinks,
         exists (select 1 from public.clash_strikes k
                  where k.stat = p_stat and k.player_id = f.player_id and (k.club_id is null or k.club_id = f.club_id))
  from found f
  join public.players p on p.id = f.player_id
  where f.value is not null and f.value >= p_min
$$;
revoke execute on function public.clash_candidates(text, int, boolean) from public, anon, authenticated;
grant execute on function public.clash_candidates(text, int, boolean) to service_role;

-- What a sprint draws from: the 250 best-known players for the stat (most
-- Wikipedia editions), struck ones left out, then `p_limit` of them at random.
create or replace function public.clash_pool(p_stat text, p_min int, p_limit int, p_top boolean default false)
returns table (player_name text, club_id bigint, value int)
language sql stable set search_path = public as $$
  with famous as (
    select * from public.clash_candidates(p_stat, p_min, p_top)
    where not struck
    order by sitelinks desc nulls last, random()
    limit 250
  )
  select player_name, club_id, value from famous order by random() limit p_limit
$$;
revoke execute on function public.clash_pool(text, int, int, boolean) from public, anon, authenticated;
grant execute on function public.clash_pool(text, int, int, boolean) to service_role;
