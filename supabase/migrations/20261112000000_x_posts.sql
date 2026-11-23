-- The maker's Posts tab (Collins, 23 Nov 2026, option A of
-- https://claude.ai/artifact/81Un4JKJRd1BJp4yuKevAC): X posts made ready each
-- day, sent by hand from Collins's own X app (no paid X API). The words and
-- cards are worked out on each view; this keeps only what a person did: a post
-- marked posted or skipped, and words edited by hand.
create table public.x_posts (
  play_date   date not null,
  kind        text not null check (kind in ('daily-on', 'team', 'clash', 'full-time')),
  status      text check (status in ('posted', 'skipped')),
  -- The words as edited (null: the drafted words, worked out fresh).
  words       text,
  updated_at  timestamptz not null default now(),
  primary key (play_date, kind)
);

-- Staff only, through the service role: no client policy.
alter table public.x_posts enable row level security;
