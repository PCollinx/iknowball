-- Famous players in the Daily too (Collins, 29 Oct 2026): the draft's helpers
-- also return how well known each player is (players.sitelinks), so Rapid
-- picks, In Order and Era picks favour names people know. Free Recall stays
-- the whole list. A new column in the result means drop and create.

drop function if exists public.club_pair_players(bigint, bigint);
create function public.club_pair_players(p_a bigint, p_b bigint)
returns table (player_id bigint, known_as text, joined_a date, joined_b date, sitelinks int)
language sql stable set search_path = public as $$
  select p.id, p.known_as, min(a.joined_on), min(b.joined_on), p.sitelinks
  from pl_era_spells a
  join pl_era_spells b on b.player_id = a.player_id and b.club_id = p_b
  join players p on p.id = a.player_id
  where a.club_id = p_a
  group by p.id, p.known_as, p.sitelinks
$$;

drop function if exists public.club_pair_decoys(bigint, bigint);
create function public.club_pair_decoys(p_a bigint, p_b bigint)
returns table (player_id bigint, known_as text, club_id bigint, sitelinks int)
language sql stable set search_path = public as $$
  select distinct p.id, p.known_as, s.club_id, p.sitelinks
  from pl_era_spells s
  join players p on p.id = s.player_id
  where s.club_id in (p_a, p_b)
    and not exists (
      select 1 from pl_era_spells o
      where o.player_id = s.player_id and o.club_id = case when s.club_id = p_a then p_b else p_a end
    )
$$;

drop function if exists public.club_dated_spells(bigint);
create function public.club_dated_spells(p_club bigint)
returns table (player_id bigint, known_as text, joined_on date, left_on date, sitelinks int)
language sql stable set search_path = public as $$
  select p.id, p.known_as, s.joined_on, s.left_on, p.sitelinks
  from pl_era_spells s
  join players p on p.id = s.player_id
  where s.club_id = p_club and s.joined_on is not null and s.left_on is not null
$$;

revoke execute on function public.club_pair_players(bigint, bigint) from public, anon, authenticated;
revoke execute on function public.club_pair_decoys(bigint, bigint) from public, anon, authenticated;
revoke execute on function public.club_dated_spells(bigint) from public, anon, authenticated;
grant execute on function public.club_pair_players(bigint, bigint) to service_role;
grant execute on function public.club_pair_decoys(bigint, bigint) to service_role;
grant execute on function public.club_dated_spells(bigint) to service_role;
