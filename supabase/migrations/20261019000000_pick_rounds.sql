-- Multiple-choice rounds (Collins, 19 Oct 2026): tap one of a few options
-- instead of typing.
--   pick: Rapid picks, a Part 1 choice beside Free Recall. Each question shows
--         a few players and one is right (e.g. played for both clubs).
--   era:  Era picks, a Part 2 choice beside In Order. Each question names a
--         player at a club and the options are periods ("1999–2007").
-- Each question is one daily_answers row: answer_text is the right option,
-- choices every option in the order shown, question the line above them
-- (null when the part's prompt says it all), position the question number.

alter table public.dailies drop constraint dailies_format_check;
alter table public.dailies add constraint dailies_format_check
  check (format in ('free_recall', 'in_order', 'pick', 'era'));
alter table public.dailies add constraint dailies_format_part_check
  check ((part = 1 and format in ('free_recall', 'pick')) or (part = 2 and format in ('in_order', 'era')));

alter table public.daily_answers add column question text;
alter table public.daily_answers add column choices text[] not null default '{}';
alter table public.daily_answers add constraint daily_answers_choice_in_choices
  check (cardinality(choices) = 0 or answer_text = any (choices));

-- maker_save_day now takes each part's format (defaulting to the typed rounds)
-- and every answer's question and choices.
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
    insert into dailies (play_date, part, format, title, prompt, time_limit_seconds, answer_count, status, source_note, checked_by)
    values (
      p_play_date, n, fmt,
      spec ->> 'title', spec ->> 'prompt', (spec ->> 'time_limit_seconds')::smallint,
      jsonb_array_length(spec -> 'answers'), p_status, nullif(spec ->> 'source_note', ''), p_checked_by
    )
    on conflict (play_date, part) do update set
      format = excluded.format,
      title = excluded.title,
      prompt = excluded.prompt,
      time_limit_seconds = excluded.time_limit_seconds,
      answer_count = excluded.answer_count,
      status = excluded.status,
      source_note = excluded.source_note,
      checked_by = excluded.checked_by
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

-- Players who played for exactly one of two clubs in the Premier League era:
-- the wrong options for a Rapid picks question about both.
create or replace function public.club_pair_decoys(p_a bigint, p_b bigint)
returns table (player_id bigint, known_as text, club_id bigint)
language sql stable set search_path = public as $$
  select distinct p.id, p.known_as, s.club_id
  from pl_era_spells s
  join players p on p.id = s.player_id
  where s.club_id in (p_a, p_b)
    and not exists (
      select 1 from pl_era_spells o
      where o.player_id = s.player_id and o.club_id = case when s.club_id = p_a then p_b else p_a end
    )
$$;

-- A club's Premier League era spells with both dates known: Era picks questions.
create or replace function public.club_dated_spells(p_club bigint)
returns table (player_id bigint, known_as text, joined_on date, left_on date)
language sql stable set search_path = public as $$
  select p.id, p.known_as, s.joined_on, s.left_on
  from pl_era_spells s
  join players p on p.id = s.player_id
  where s.club_id = p_club and s.joined_on is not null and s.left_on is not null
$$;

revoke execute on function public.club_pair_decoys(bigint, bigint) from public, anon, authenticated;
revoke execute on function public.club_dated_spells(bigint) from public, anon, authenticated;
grant execute on function public.club_pair_decoys(bigint, bigint) to service_role;
grant execute on function public.club_dated_spells(bigint) to service_role;
