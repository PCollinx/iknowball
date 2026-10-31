-- Beaten challenges come back (Collins, 31 Oct 2026, mocks at
-- https://claude.ai/artifact/V7SuwLBLP6oSZwyw7norBW): home tells you when a
-- mate beats the score on a challenge you sent, until you look at its table;
-- "Settle it" makes a new set on the same stat for the mate who beat you.

-- When the setter last opened the challenge's table: a beat after it is news.
alter table public.clash_sets add column seen_at timestamptz;
-- A rematch's mate: the player who beat the setter's last challenge.
alter table public.clash_sets add column rival_id uuid references public.profiles(id) on delete set null;

create index clash_sets_created_by_idx on public.clash_sets (created_by, created_at desc);
