-- The League: invite codes in the same alphabet as Clash links (no 0/O/1/I),
-- and at most 50 players a league, checked where the row goes in so two
-- joins at once can't both squeeze past the limit.

alter table public.leagues
  add constraint leagues_invite_code_format check (invite_code ~ '^[A-Z0-9]{6}$');

create or replace function public.league_cap()
returns trigger language plpgsql set search_path = public as $$
begin
  perform 1 from public.leagues where id = new.league_id for update;
  if (select count(*) from public.league_members where league_id = new.league_id) >= 50 then
    raise exception 'league_full' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger league_cap before insert on public.league_members
  for each row execute function public.league_cap();
