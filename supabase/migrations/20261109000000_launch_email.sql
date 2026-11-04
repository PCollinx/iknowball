-- The launch email (Collins, 4 Nov 2026, step 17 of the launch plan, mock D on
-- https://claude.ai/artifact/QdP8wKwtFZdX6ySvB5wqQ4): one email to everyone on
-- the waitlist when the gates open on Fri 20 Nov. Each row is sent once, so a
-- rerun (or the next day, past Resend's daily cap) carries on where it stopped.

alter table public.waitlist add column launch_emailed_at timestamptz;
-- Set by the email's unsubscribe link; nobody unsubscribed is ever emailed again.
alter table public.waitlist add column unsubscribed_at timestamptz;

-- The launch email runs through the control room like the other jobs.
alter table public.job_runs drop constraint job_runs_job_check;
alter table public.job_runs add constraint job_runs_job_check
  check (job in ('fixtures', 'match-data', 'import-wikidata', 'drafts', 'launch-email'));
