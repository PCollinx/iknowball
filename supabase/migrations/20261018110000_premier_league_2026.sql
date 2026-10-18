-- The 2026/27 Premier League (checked 18 Oct 2026). Promoted: Coventry
-- (champions), Ipswich and Hull (play-offs). Relegated: West Ham, Burnley and
-- Wolves, who leave "Who do you support?" (fans who already picked them keep
-- them). Each summer, flip in_premier_league and fan_pick the same way.

insert into public.clubs (name, short_name, shirt_colour, number_colour, trim_colour, in_premier_league, fan_pick, kit_pattern, kit_collar)
values
  ('Coventry', 'COV', '#59B7E8', '#FFFFFF', '#FFFFFF', true, true, 'sides',   'crew'),
  ('Hull',     'HUL', '#F5A12D', '#000000', '#000000', true, true, 'stripes', 'crew'),
  ('Ipswich',  'IPS', '#3A64A3', '#FFFFFF', '#FFFFFF', true, true, 'sleeves', 'crew')
on conflict (short_name) do update set
  shirt_colour      = excluded.shirt_colour,
  number_colour     = excluded.number_colour,
  trim_colour       = excluded.trim_colour,
  in_premier_league = true,
  fan_pick          = true,
  kit_pattern       = excluded.kit_pattern,
  kit_collar        = excluded.kit_collar;

update public.clubs set in_premier_league = false, fan_pick = false
where short_name in ('WHU', 'BUR', 'WOL');
