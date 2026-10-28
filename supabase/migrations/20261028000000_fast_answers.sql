-- Faster, fairer rounds (27 Oct 2026). Measured on a preview: a Clash call took
-- 0.7 to 1.3 s and the clock had run 5 s before the first players showed.
--
-- 1. The clock starts when the round is on screen. Kick off saves the try with
--    begun_at null and a deadline of the time limit plus a short allowance; the
--    round's first request (begin_attempt / begin_clash_run) starts the real
--    clock, never later than that allowance after kick off. A player who blocks
--    that request gains at most the allowance.
-- 2. Each answer is one round trip: the functions below check the try, record
--    the answer and move the score in one statement. Whether an answer is right
--    is still decided in the app (src/lib/daily, src/lib/clash) from the answer
--    key it caches; the database checks the try is theirs, open and in step.

alter table public.attempts add column begun_at timestamptz;
alter table public.clash_runs add column begun_at timestamptz;
-- Tries made before this were timed from kick off.
update public.attempts set begun_at = started_at;
update public.clash_runs set begun_at = started_at;

-- Starts a Daily part's clock: the part's time limit from now, capped at
-- p_allow seconds after kick off. Returns the deadline (also when it had begun).
create or replace function public.begin_attempt(p_attempt bigint, p_user uuid, p_allow int)
returns timestamptz
language sql set search_path = public as $$
  with began as (
    update attempts a
       set begun_at = now(),
           deadline_at = least(now() + make_interval(secs => d.time_limit_seconds),
                               a.started_at + make_interval(secs => d.time_limit_seconds + p_allow))
      from dailies d
     where d.id = a.daily_id and a.id = p_attempt and a.user_id = p_user
       and a.begun_at is null and a.submitted_at is null
    returning a.deadline_at
  )
  select coalesce((select deadline_at from began),
                  (select deadline_at from attempts where id = p_attempt and user_id = p_user));
$$;

-- The same for a Clash sprint.
create or replace function public.begin_clash_run(p_run bigint, p_user uuid, p_seconds int, p_allow int)
returns timestamptz
language sql set search_path = public as $$
  with began as (
    update clash_runs r
       set begun_at = now(),
           deadline_at = least(now() + make_interval(secs => p_seconds),
                               r.started_at + make_interval(secs => p_seconds + p_allow))
     where r.id = p_run and r.user_id = p_user and r.begun_at is null and r.submitted_at is null
    returning r.deadline_at
  )
  select coalesce((select deadline_at from began),
                  (select deadline_at from clash_runs where id = p_run and user_id = p_user));
$$;

-- One Free Recall guess. p_answer is the answer it matched (null when wrong).
-- Returns 'closed', 'wrong', 'duplicate' or 'correct', with the number found.
create or replace function public.daily_guess(
  p_attempt bigint, p_user uuid, p_daily bigint, p_input text, p_answer bigint,
  p_answers int, p_part_max int, p_max_guesses int, p_grace_ms int
)
returns table (r_status text, r_found int, r_done boolean)
language plpgsql set search_path = public as $$
declare
  a attempts%rowtype;
  n int;
begin
  select t.* into a
    from attempts t join dailies d on d.id = t.daily_id
   where t.id = p_attempt and t.user_id = p_user and t.daily_id = p_daily and d.format = 'free_recall'
     for update of t;
  if a.id is null or a.submitted_at is not null
     or now() > a.deadline_at + make_interval(secs => p_grace_ms / 1000.0)
     or (select count(*) from attempt_guesses g where g.attempt_id = a.id) >= p_max_guesses then
    return query select 'closed', a.correct_count::int, false;
    return;
  end if;

  if p_answer is not null and exists (select 1 from attempt_guesses g where g.attempt_id = a.id and g.answer_id = p_answer) then
    insert into attempt_guesses (attempt_id, raw_input, answer_id) values (a.id, p_input, p_answer);
    return query select 'duplicate', a.correct_count::int, false;
    return;
  end if;

  insert into attempt_guesses (attempt_id, raw_input, answer_id) values (a.id, p_input, p_answer);
  if p_answer is null then
    return query select 'wrong', a.correct_count::int, false;
    return;
  end if;

  select count(distinct g.answer_id) into n from attempt_guesses g where g.attempt_id = a.id and g.answer_id is not null;
  update attempts
     set begun_at = coalesce(begun_at, now()),
         correct_count = n,
         score = round(p_part_max * least(1, n::numeric / greatest(p_answers, 1))),
         submitted_at = case when n >= p_answers then now() end
   where id = a.id;
  return query select 'correct', n, n >= p_answers;
end;
$$;

-- One Rapid or Era picks tap on question p_question. A question keeps its first
-- tap: 'answered' returns the choice made then. Otherwise 'new'.
create or replace function public.daily_pick(
  p_attempt bigint, p_user uuid, p_daily bigint, p_question bigint, p_choice text,
  p_answers int, p_part_max int, p_grace_ms int
)
returns table (r_status text, r_choice text, r_done boolean)
language plpgsql set search_path = public as $$
declare
  a attempts%rowtype;
  earlier text;
  taps int;
  correct int;
begin
  select t.* into a
    from attempts t join dailies d on d.id = t.daily_id
   where t.id = p_attempt and t.user_id = p_user and t.daily_id = p_daily and d.format in ('pick', 'era')
     for update of t;
  if a.id is null or a.submitted_at is not null
     or now() > a.deadline_at + make_interval(secs => p_grace_ms / 1000.0) then
    return query select 'closed', null::text, false;
    return;
  end if;

  select g.raw_input into earlier from attempt_guesses g where g.attempt_id = a.id and g.answer_id = p_question limit 1;
  if earlier is not null then
    return query select 'answered', earlier, false;
    return;
  end if;

  insert into attempt_guesses (attempt_id, raw_input, answer_id) values (a.id, p_choice, p_question);
  select count(*), count(*) filter (where g.raw_input = x.answer_text) into taps, correct
    from attempt_guesses g join daily_answers x on x.id = g.answer_id
   where g.attempt_id = a.id;
  update attempts
     set begun_at = coalesce(begun_at, now()),
         correct_count = correct,
         score = round(p_part_max * least(1, correct::numeric / greatest(p_answers, 1))),
         submitted_at = case when taps >= p_answers then now() end
   where id = a.id;
  return query select 'new', p_choice, taps >= p_answers;
end;
$$;

-- One Clash call. p_at is the index of the player on show as the app saw it, so
-- a double tap (or a stale screen) changes nothing. p_last: this call answers
-- the set's last pair. Returns no row when the run isn't theirs, open or in step.
create or replace function public.clash_answer(
  p_run bigint, p_user uuid, p_set bigint, p_at int, p_right boolean,
  p_last boolean, p_penalty int, p_grace_ms int
)
returns table (r_deadline timestamptz, r_submitted timestamptz)
language sql set search_path = public as $$
  update clash_runs r
     set begun_at = coalesce(r.begun_at, now()),
         answered = r.answered + 1,
         right_count = r.right_count + case when p_right then 1 else 0 end,
         current_run = case when p_right then r.current_run + 1 else 0 end,
         best_run = greatest(r.best_run, case when p_right then r.current_run + 1 else 0 end),
         kicks = r.kicks || case when p_right then '1' else '0' end,
         deadline_at = n.deadline,
         submitted_at = case when p_last or n.deadline <= now() then least(now(), n.deadline) end
    from (select case when p_right then deadline_at else deadline_at - make_interval(secs => p_penalty) end as deadline
            from clash_runs where id = p_run) n
   where r.id = p_run and r.user_id = p_user and r.set_id = p_set and r.answered = p_at
     and r.submitted_at is null
     and now() <= r.deadline_at + make_interval(secs => p_grace_ms / 1000.0)
  returning r.deadline_at, r.submitted_at;
$$;

revoke execute on function public.begin_attempt(bigint, uuid, int) from public, anon, authenticated;
revoke execute on function public.begin_clash_run(bigint, uuid, int, int) from public, anon, authenticated;
revoke execute on function public.daily_guess(bigint, uuid, bigint, text, bigint, int, int, int, int) from public, anon, authenticated;
revoke execute on function public.daily_pick(bigint, uuid, bigint, bigint, text, int, int, int) from public, anon, authenticated;
revoke execute on function public.clash_answer(bigint, uuid, bigint, int, boolean, boolean, int, int) from public, anon, authenticated;
grant execute on function public.begin_attempt(bigint, uuid, int) to service_role;
grant execute on function public.begin_clash_run(bigint, uuid, int, int) to service_role;
grant execute on function public.daily_guess(bigint, uuid, bigint, text, bigint, int, int, int, int) to service_role;
grant execute on function public.daily_pick(bigint, uuid, bigint, bigint, text, int, int, int) to service_role;
grant execute on function public.clash_answer(bigint, uuid, bigint, int, boolean, boolean, int, int) to service_role;
