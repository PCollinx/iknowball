-- Kit details, so clubs that share colours still wear different shirts
-- (Collins, 18 Oct 2026: Liverpool, Man United and Forest all looked the
-- same, as did Chelsea and Everton).
--
-- New patterns, all in trim_colour: broad "bars", thin "pinstripes", a
-- chest "hoop", side panels ("sides") and a shoulder "yoke". The collar is
-- now a crew neck or a fold-down polo.

alter table public.clubs drop constraint clubs_kit_pattern_check;
alter table public.clubs add constraint clubs_kit_pattern_check
  check (kit_pattern in ('plain', 'stripes', 'bars', 'pinstripes', 'sleeves', 'band', 'hoop', 'sides', 'yoke'));

alter table public.clubs add column kit_collar text not null default 'crew'
  check (kit_collar in ('crew', 'polo'));

-- Each look-alike group differs by pattern or collar:
--   reds: Liverpool plain, United black sides and polo, Forest pinstripes,
--     Bayern polo, Arsenal sleeves;
--   blues: Chelsea plain, Everton pinstripes and polo;
--   claret and blue: Villa sleeves, Burnley yoke and polo, West Ham hoop;
--   striped: Newcastle v Juventus, Bournemouth v Milan, Sunderland v
--     Brentford, Brighton v Palace each split stripes and bars;
--   whites: Spurs polo, Leeds yellow sides, Fulham and Real Madrid by trim.
update public.clubs c set kit_pattern = v.pattern, kit_collar = v.collar
from (values
  ('ARS', 'sleeves',    'crew'),
  ('AVL', 'sleeves',    'crew'),
  ('BOU', 'stripes',    'crew'),
  ('BRE', 'bars',       'crew'),
  ('BHA', 'stripes',    'crew'),
  ('BUR', 'yoke',       'polo'),
  ('CHE', 'plain',      'crew'),
  ('CRY', 'bars',       'crew'),
  ('EVE', 'pinstripes', 'polo'),
  ('FUL', 'plain',      'crew'),
  ('LEE', 'sides',      'crew'),
  ('LIV', 'plain',      'crew'),
  ('MCI', 'plain',      'crew'),
  ('MUN', 'sides',      'polo'),
  ('NEW', 'stripes',    'crew'),
  ('NFO', 'pinstripes', 'crew'),
  ('SUN', 'stripes',    'polo'),
  ('TOT', 'plain',      'polo'),
  ('WHU', 'hoop',       'crew'),
  ('WOL', 'plain',      'crew'),
  ('BAR', 'stripes',    'crew'),
  ('RMA', 'plain',      'crew'),
  ('BAY', 'plain',      'polo'),
  ('PSG', 'band',       'crew'),
  ('JUV', 'bars',       'polo'),
  ('MIL', 'bars',       'crew')
) as v(short_name, pattern, collar)
where c.short_name = v.short_name;
