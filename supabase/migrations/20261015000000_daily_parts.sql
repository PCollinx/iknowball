-- The Daily has two parts on the same day: Part 1 Free Recall, Part 2 In Order
-- (layouts picked 15 Oct 2026). Each part is its own row with its own answer
-- key, timer and one-try attempt.

alter table public.dailies drop constraint dailies_play_date_key;
alter table public.dailies add column part smallint not null default 1 check (part between 1 and 2);
alter table public.dailies add constraint dailies_play_date_part_key unique (play_date, part);

-- Free Recall answers have no position; In Order answers need one for each slot.
alter table public.daily_answers add constraint daily_answers_position_positive check (position is null or position >= 1);

-- Shown beside an answer on the reveal, e.g. the year for an In Order item.
alter table public.daily_answers add column reveal_note text;
