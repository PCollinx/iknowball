-- One name a nation (Collins, 23 Nov 2026): Wikidata gives some players
-- "Kingdom of the Netherlands" and others "Netherlands" (Denmark the same), so
-- a country's players were split into two lists. The import now stores one
-- name (nationName() in src/lib/drafts/wikidata.ts); this fixes rows already in.
update public.players set nationality = 'Netherlands' where nationality = 'Kingdom of the Netherlands';
update public.players set nationality = 'Denmark' where nationality = 'Kingdom of Denmark';
