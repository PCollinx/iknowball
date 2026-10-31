-- Waitlist leagues (Collins, 31 Oct 2026, step 18 of the launch plan): a
-- league named on the waitlist starts on launch day. It's made the first time
-- that email signs in from Fri 20 Nov, with them as captain; matching on the
-- signed-in email is what proves the league is theirs.

-- When the waitlist row's league was made (or found unusable), so it's made once.
alter table public.waitlist add column league_claimed_at timestamptz;
alter table public.waitlist add column league_id bigint references public.leagues(id) on delete set null;
