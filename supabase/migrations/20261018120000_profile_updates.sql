-- Players edit their own profile (name, club) through their own session.
--
-- The old policy checked "is_admin = false" on the updated row, so an admin's
-- own profile could never be saved ("Couldn't save your club"). Instead of
-- checking the flag, players may only write the columns they own: is_admin,
-- club_switched_season and the rest stay service-role only. The once-a-season
-- club rule is still the guard_favourite_club trigger.

drop policy "update own profile" on public.profiles;
create policy "update own profile" on public.profiles for update
  using (auth.uid() = id) with check (auth.uid() = id);

revoke update on public.profiles from anon, authenticated;
grant select on public.profiles to anon, authenticated;
grant update (username, favourite_club_id, club_asked_at) on public.profiles to authenticated;
