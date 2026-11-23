-- Unknown ends (Collins, 23 Nov 2026, after Wesley Fofana was marked wrong in
-- "French players at Chelsea"): Wikidata gives some spells' end as "unknown
-- value", and the import used to drop them. They're kept now with left_on
-- null and this flag, which says left_on null here doesn't mean he's still
-- there. Lists of who played for a club use them; questions that need the
-- dates (careers, moves, overlaps) don't.
alter table public.player_spells add column end_unknown boolean not null default false;

-- The view picks up the new column (select * is fixed when a view is made).
create or replace view public.pl_era_spells with (security_invoker = true) as
  select * from public.player_spells
  where coalesce(left_on, joined_on) is not null
    and coalesce(left_on, 'infinity'::date) >= date '1992-08-15';

-- club_spells returns the flag, so the drafts can tell.
drop function public.club_spells(bigint);
create function public.club_spells(p_club bigint)
returns table (
  player_id bigint, known_as text, sitelinks int, date_of_birth date, joined_on date, left_on date, on_loan boolean, aliases text[],
  nationality text, height_cm smallint, career_clubs smallint, end_unknown boolean
)
language sql stable set search_path = public as $$
  select p.id, p.known_as, p.sitelinks, p.date_of_birth, s.joined_on, s.left_on, s.on_loan,
         array(select a.alias from player_aliases a where a.player_id = p.id),
         p.nationality, p.height_cm, p.career_clubs, s.end_unknown
  from pl_era_spells s
  join players p on p.id = s.player_id
  where s.club_id = p_club
  order by p.id, s.joined_on
$$;
revoke execute on function public.club_spells(bigint) from public, anon, authenticated;
grant execute on function public.club_spells(bigint) to service_role;

-- Careers order clubs and find moves by date: an unknown end would read as
-- "still there", so those spells stay out, as they were before.
create or replace function public.player_careers(p_ids bigint[])
returns table (player_id bigint, club_id bigint, joined_on date, left_on date, on_loan boolean)
language sql stable set search_path = public as $$
  select s.player_id, s.club_id, s.joined_on, s.left_on, s.on_loan
  from pl_era_spells s
  where s.player_id = any(p_ids) and not s.end_unknown
  order by s.player_id, s.joined_on
$$;
