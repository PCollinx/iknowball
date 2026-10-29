-- More Daily templates (Collins, 29 Oct 2026: 43 kept of 66, built in waves).
-- Loans are marked on spells so career paths, swaps and moves skip them; each
-- Daily part records the template that drafted it, so the draft job doesn't
-- repeat one within a week; English cup ties join the fixtures for cup nights.

-- Wikidata's "acquisition transaction: loan" (P1642 = Q2914547) on the spell.
alter table public.player_spells add column on_loan boolean not null default false;

-- The view was made with select *, which fixed its columns: remake it to carry on_loan.
create or replace view public.pl_era_spells with (security_invoker = true) as
  select * from public.player_spells
  where coalesce(left_on, joined_on) is not null
    and coalesce(left_on, 'infinity'::date) >= date '1992-08-15';

-- The draft template a part came from ("played-for-both", "oldest-first", …).
-- Null for parts written in the maker.
alter table public.dailies add column template text;

-- FA Cup and League Cup ties between clubs we track (cup nights).
alter table public.fixtures drop constraint fixtures_competition_check;
alter table public.fixtures add constraint fixtures_competition_check
  check (competition in ('PL', 'UCL', 'FAC', 'EFL'));

-- maker_save_day as before, plus the template.
create or replace function public.maker_save_day(
  p_play_date date,
  p_status text,
  p_checked_by uuid,
  p_parts jsonb
) returns void
language plpgsql
set search_path = public
as $$
declare
  n smallint;
  spec jsonb;
  existing_id bigint;
  saved_id bigint;
  played boolean;
  fmt text;
begin
  if p_status not in ('draft', 'scheduled') then
    raise exception 'Unknown status %', p_status;
  end if;

  for n in 1..2 loop
    spec := p_parts -> (n - 1);
    if spec is not null and jsonb_typeof(spec) = 'null' then
      spec := null;
    end if;
    if spec is not null and (spec ->> 'keep')::boolean is true then
      continue;
    end if;

    select id into existing_id from dailies where play_date = p_play_date and part = n for update;
    played := existing_id is not null and exists (select 1 from attempts where daily_id = existing_id);
    if played then
      raise exception 'Part % has already been played and can''t be changed', n;
    end if;

    if spec is null then
      delete from dailies where id = existing_id;
      continue;
    end if;

    fmt := coalesce(spec ->> 'format', case n when 1 then 'free_recall' else 'in_order' end);
    insert into dailies (play_date, part, format, title, prompt, time_limit_seconds, answer_count, status, source_note, checked_by, template)
    values (
      p_play_date, n, fmt,
      spec ->> 'title', spec ->> 'prompt', (spec ->> 'time_limit_seconds')::smallint,
      jsonb_array_length(spec -> 'answers'), p_status, nullif(spec ->> 'source_note', ''), p_checked_by,
      nullif(spec ->> 'template', '')
    )
    on conflict (play_date, part) do update set
      format = excluded.format,
      title = excluded.title,
      prompt = excluded.prompt,
      time_limit_seconds = excluded.time_limit_seconds,
      answer_count = excluded.answer_count,
      status = excluded.status,
      source_note = excluded.source_note,
      checked_by = excluded.checked_by,
      template = excluded.template
    returning id into saved_id;

    delete from daily_answers where daily_id = saved_id;
    insert into daily_answers (daily_id, position, answer_text, extra_aliases, reveal_note, question, choices)
    select saved_id, a.position, a.answer_text, coalesce(a.extra_aliases, '{}'), nullif(a.reveal_note, ''),
           nullif(a.question, ''), coalesce(a.choices, '{}')
    from jsonb_to_recordset(spec -> 'answers')
      as a(position smallint, answer_text text, extra_aliases text[], reveal_note text, question text, choices text[]);
  end loop;
end $$;

revoke execute on function public.maker_save_day(date, text, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.maker_save_day(date, text, uuid, jsonb) to service_role;

-- Every Premier League era spell at one club, dated or not, with what the
-- templates need about the player. Paged by the caller (.range), since big
-- clubs pass a thousand rows.
create function public.club_spells(p_club bigint)
returns table (player_id bigint, known_as text, sitelinks int, date_of_birth date, joined_on date, left_on date, on_loan boolean, aliases text[])
language sql stable set search_path = public as $$
  select p.id, p.known_as, p.sitelinks, p.date_of_birth, s.joined_on, s.left_on, s.on_loan,
         array(select a.alias from player_aliases a where a.player_id = p.id)
  from pl_era_spells s
  join players p on p.id = s.player_id
  where s.club_id = p_club
  order by p.id, s.joined_on
$$;

-- Every Premier League era spell of some players, at any club we track: their
-- careers, for moves, chains and paths.
create function public.player_careers(p_ids bigint[])
returns table (player_id bigint, club_id bigint, joined_on date, left_on date, on_loan boolean)
language sql stable set search_path = public as $$
  select s.player_id, s.club_id, s.joined_on, s.left_on, s.on_loan
  from pl_era_spells s
  where s.player_id = any(p_ids)
  order by s.player_id, s.joined_on
$$;

revoke execute on function public.club_spells(bigint) from public, anon, authenticated;
revoke execute on function public.player_careers(bigint[]) from public, anon, authenticated;
grant execute on function public.club_spells(bigint) to service_role;
grant execute on function public.player_careers(bigint[]) to service_role;
