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

-- A local admin for the Daily maker (/maker): admin@iknowball.local / ball-knowledge.
-- Local only. On the live project, create the user in the Supabase dashboard
-- and set profiles.is_admin there (see README).
with u as (
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                          raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                          confirmation_token, recovery_token, email_change_token_new, email_change)
  values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
          'admin@iknowball.local', extensions.crypt('ball-knowledge', extensions.gen_salt('bf')), now(),
          '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '')
  returning id, email
), i as (
  insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  select u.id::text, u.id, jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true), 'email', now(), now(), now()
  from u
)
select 1;

-- A separate statement: the profile row the trigger made isn't visible above.
update public.profiles set is_admin = true
where id = (select id from auth.users where email = 'admin@iknowball.local');
