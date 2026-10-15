-- Local development only: runs on `supabase db reset`, never on the live
-- database. A sample Daily dated today so /daily has something to play.
-- Example content; real Dailies are built from synced data and checked.

with p1 as (
  insert into public.dailies (play_date, part, format, title, prompt, time_limit_seconds, answer_count, status, source_note)
  values (public.game_date(), 1, 'free_recall', 'Chelsea v Arsenal',
          'Name the 17 players who''ve played for both clubs in the Premier League.', 120, 17, 'scheduled',
          'Sample for local development')
  returning id
)
insert into public.daily_answers (daily_id, answer_text, extra_aliases)
select p1.id, a.text, a.aliases from p1, (values
  ('Ashley Cole', '{}'::text[]),
  ('William Gallas', '{}'),
  ('Cesc Fàbregas', '{Cesc}'),
  ('Olivier Giroud', '{}'),
  ('Petr Čech', '{Chech}'),
  ('David Luiz', '{Luiz}'),
  ('Willian', '{}'),
  ('Jorginho', '{}'),
  ('Pierre-Emerick Aubameyang', '{Auba}'),
  ('Kai Havertz', '{}'),
  ('Raheem Sterling', '{}'),
  ('Lassana Diarra', '{Lass}'),
  ('Emmanuel Petit', '{Manu Petit}'),
  ('Nicolas Anelka', '{}'),
  ('Yossi Benayoun', '{}'),
  ('Kepa Arrizabalaga', '{Kepa}'),
  ('Noni Madueke', '{Noni}')
) as a(text, aliases);

with p2 as (
  insert into public.dailies (play_date, part, format, title, prompt, time_limit_seconds, answer_count, status, source_note)
  values (public.game_date(), 2, 'in_order', 'In order',
          'When did they first sign for Chelsea? Earliest at the top.', 60, 6, 'scheduled',
          'Sample for local development')
  returning id
)
insert into public.daily_answers (daily_id, position, answer_text, reveal_note)
select p2.id, a.pos, a.text, a.note from p2, (values
  (1, 'Emmanuel Petit', '2001'),
  (2, 'Ashley Cole', '2006'),
  (3, 'Nicolas Anelka', '2008'),
  (4, 'Cesc Fàbregas', '2014'),
  (5, 'Jorginho', '2018'),
  (6, 'Kai Havertz', '2020')
) as a(pos, text, note);
