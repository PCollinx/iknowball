-- League appearances and goals per club spell, from Wikidata's P1350 and
-- P1351 qualifiers where they exist. Clash's Higher or Lower facts are built
-- from these, so every number comes from data.
alter table public.player_spells
  add column apps smallint check (apps >= 0),
  add column goals smallint check (goals >= 0);
