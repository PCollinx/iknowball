-- The Daily maker: an admin page that writes a day's parts and answer keys.

-- How many players have started each Daily. security_invoker keeps the
-- attempts RLS in force, so only the service role sees every row.
create view public.daily_play_counts with (security_invoker = true) as
  select daily_id, count(*)::int as plays
  from public.attempts
  group by daily_id;

-- Saves one day in a single transaction: each part's row and its full answer
-- key. p_parts holds one entry per part (1 Free Recall, 2 In Order):
--   null                 -> delete that part (only if nobody has played it)
--   {"keep": true}       -> leave it exactly as it is
--   {title, prompt, time_limit_seconds, source_note, answers: [{answer_text,
--    extra_aliases, position, reveal_note}]} -> write it and replace its key
-- A part that anyone has started can't be changed or deleted.
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

    insert into dailies (play_date, part, format, title, prompt, time_limit_seconds, answer_count, status, source_note, checked_by)
    values (
      p_play_date, n,
      case n when 1 then 'free_recall' else 'in_order' end,
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
    insert into daily_answers (daily_id, position, answer_text, extra_aliases, reveal_note)
    select saved_id, a.position, a.answer_text, coalesce(a.extra_aliases, '{}'), nullif(a.reveal_note, '')
    from jsonb_to_recordset(spec -> 'answers')
      as a(position smallint, answer_text text, extra_aliases text[], reveal_note text);
  end loop;
end $$;

-- Only the server (service role) may call it.
revoke execute on function public.maker_save_day(date, text, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.maker_save_day(date, text, uuid, jsonb) to service_role;
