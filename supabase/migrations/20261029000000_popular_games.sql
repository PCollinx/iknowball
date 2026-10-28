-- Popular games only (Collins, 29 Oct 2026). Dailies and Clash stick to clubs
-- people know: every Daily has one of the Premier League's big six, Champions
-- League nights use a UCL tie, and Clash draws famous players at top clubs.

-- The top clubs: England's big six and Europe's giants.
alter table public.clubs add column top boolean not null default false;

-- Three more of Europe's giants, for UCL nights. Kits differ from the clubs
-- that share their colours (Atlético from Sunderland by collar and red,
-- Dortmund from Wolves by collar).
insert into public.clubs (name, short_name, shirt_colour, number_colour, trim_colour, in_premier_league, fan_pick, kit_pattern, kit_collar)
values
  ('Inter', 'INT', '#0068A8', '#FFFFFF', '#111111', false, false, 'stripes', 'crew'),
  ('Atlético Madrid', 'ATM', '#CB3524', '#272E61', '#FFFFFF', false, false, 'stripes', 'crew'),
  ('Dortmund', 'BVB', '#FDE100', '#111111', '#111111', false, false, 'plain', 'polo')
on conflict (short_name) do nothing;

update public.clubs set top = true
where short_name in ('ARS', 'CHE', 'LIV', 'MCI', 'MUN', 'TOT', 'RMA', 'BAR', 'BAY', 'PSG', 'JUV', 'MIL', 'INT', 'ATM', 'BVB');

-- Fixtures from more than one competition. pl_round stays Premier League only.
alter table public.fixtures add column competition text not null default 'PL'
  check (competition in ('PL', 'UCL'));

-- How famous a player is: the number of Wikipedia editions with an article on
-- them (Wikidata sitelinks). Filled by the Wikidata import.
alter table public.players add column sitelinks int;

-- Clash's draw: the most famous players with the stat, then a random set of
-- them. p_top keeps to spells at top clubs; Clash falls back to every club
-- when that pool is too small.
drop function if exists public.clash_pool(text, int, int);
create or replace function public.clash_pool(p_stat text, p_min int, p_limit int, p_top boolean default false)
returns table (player_name text, club_id bigint, value int)
language sql stable set search_path = public as $$
  with eligible as (
    select p.known_as, s.club_id, p.sitelinks, sum(case when p_stat = 'goals' then s.goals else s.apps end)::int as value
    from public.player_spells s
    join public.players p on p.id = s.player_id
    join public.clubs c on c.id = s.club_id
    where c.top or not p_top
    group by p.id, p.known_as, p.sitelinks, s.club_id
    having bool_and((case when p_stat = 'goals' then s.goals else s.apps end) is not null)
       and sum(case when p_stat = 'goals' then s.goals else s.apps end) >= p_min
  ),
  famous as (
    select * from eligible order by sitelinks desc nulls last, random() limit 250
  )
  select known_as, club_id, value from famous order by random() limit p_limit
$$;
revoke execute on function public.clash_pool(text, int, int, boolean) from public, anon, authenticated;
grant execute on function public.clash_pool(text, int, int, boolean) to service_role;
