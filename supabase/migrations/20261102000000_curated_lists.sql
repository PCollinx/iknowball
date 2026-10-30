-- Template build C (Collins, 30 Oct 2026): lists kept by hand, edited on the
-- maker's Lists page, for the templates no feed answers (Golden Boot, title
-- seasons, final tables, captains, famous results, players' ages). Clubs are
-- stored by name (clubs.name for the clubs we track, so "Man United", "Spurs");
-- the drafts match them to the day's clubs. Seeded from English Wikipedia on
-- 30 Oct 2026 for Collins to check.

-- A Premier League table, one row a place. A season with only its champion
-- (position 1) answers the title questions; a full one, where they finished.
create table public.season_standings (
  season   text not null check (season ~ '^\d{4}/\d{2}$'),
  position smallint not null check (position between 1 and 24),
  club     text not null check (club <> ''),
  points   smallint check (points >= 0),
  primary key (season, position)
);

-- Golden Boot winners, one row each, so a shared one has several.
create table public.golden_boots (
  id     bigint generated always as identity primary key,
  season text not null check (season ~ '^\d{4}/\d{2}$'),
  player text not null check (player <> ''),
  club   text not null check (club <> ''),
  goals  smallint not null check (goals > 0),
  unique (season, player)
);

-- Club captains (the armband, not stand-ins). A null to_year is the captain now.
create table public.club_captains (
  id        bigint generated always as identity primary key,
  club      text not null check (club <> ''),
  player    text not null check (player <> ''),
  from_year smallint not null check (from_year between 1880 and 2100),
  to_year   smallint check (to_year >= from_year)
);

-- Premier League results worth asking about, home side first.
create table public.famous_results (
  id         bigint generated always as identity primary key,
  played_on  date not null,
  home       text not null check (home <> ''),
  home_goals smallint not null check (home_goals >= 0),
  away_goals smallint not null check (away_goals >= 0),
  away       text not null check (away <> ''),
  unique (played_on, home)
);

-- A player's Premier League debut or first goal, with his birth date for his age then.
create table public.player_moments (
  id          bigint generated always as identity primary key,
  player      text not null check (player <> ''),
  moment      text not null check (moment in ('debut', 'first-goal')),
  club        text not null check (club <> ''),
  happened_on date not null,
  born_on     date not null check (born_on < happened_on),
  unique (player, moment)
);

-- No client policy: Daily answers are built from these rows.
alter table public.season_standings enable row level security;
alter table public.golden_boots enable row level security;
alter table public.club_captains enable row level security;
alter table public.famous_results enable row level security;
alter table public.player_moments enable row level security;

-- The maker saves a whole list at once: the rows given replace the list.
-- "where true": through the API, Supabase refuses a delete without a where.
create function public.maker_save_list(p_list text, p_rows jsonb)
returns void
language plpgsql
set search_path = public
as $$
begin
  case p_list
    when 'standings' then
      delete from season_standings where true;
      insert into season_standings (season, position, club, points)
        select season, position, club, points from jsonb_to_recordset(p_rows) as r(season text, position smallint, club text, points smallint);
    when 'golden-boots' then
      delete from golden_boots where true;
      insert into golden_boots (season, player, club, goals)
        select season, player, club, goals from jsonb_to_recordset(p_rows) as r(season text, player text, club text, goals smallint);
    when 'captains' then
      delete from club_captains where true;
      insert into club_captains (club, player, from_year, to_year)
        select club, player, from_year, to_year from jsonb_to_recordset(p_rows) as r(club text, player text, from_year smallint, to_year smallint);
    when 'results' then
      delete from famous_results where true;
      insert into famous_results (played_on, home, home_goals, away_goals, away)
        select played_on, home, home_goals, away_goals, away from jsonb_to_recordset(p_rows) as r(played_on date, home text, home_goals smallint, away_goals smallint, away text);
    when 'moments' then
      delete from player_moments where true;
      insert into player_moments (player, moment, club, happened_on, born_on)
        select player, moment, club, happened_on, born_on from jsonb_to_recordset(p_rows) as r(player text, moment text, club text, happened_on date, born_on date);
    else
      raise exception 'Unknown list: %', p_list;
  end case;
end;
$$;

revoke execute on function public.maker_save_list(text, jsonb) from public, anon, authenticated;
grant execute on function public.maker_save_list(text, jsonb) to service_role;

-- The lists as first filled, from English Wikipedia (30 Oct 2026). Champions
-- only up to 2020/21; full tables for the five seasons since.
insert into public.season_standings (season, position, club, points) values
  ('1992/93', 1, 'Man United', null),
  ('1993/94', 1, 'Man United', null),
  ('1994/95', 1, 'Blackburn', null),
  ('1995/96', 1, 'Man United', null),
  ('1996/97', 1, 'Man United', null),
  ('1997/98', 1, 'Arsenal', null),
  ('1998/99', 1, 'Man United', null),
  ('1999/00', 1, 'Man United', null),
  ('2000/01', 1, 'Man United', null),
  ('2001/02', 1, 'Arsenal', null),
  ('2002/03', 1, 'Man United', null),
  ('2003/04', 1, 'Arsenal', null),
  ('2004/05', 1, 'Chelsea', null),
  ('2005/06', 1, 'Chelsea', null),
  ('2006/07', 1, 'Man United', null),
  ('2007/08', 1, 'Man United', null),
  ('2008/09', 1, 'Man United', null),
  ('2009/10', 1, 'Chelsea', null),
  ('2010/11', 1, 'Man United', null),
  ('2011/12', 1, 'Man City', null),
  ('2012/13', 1, 'Man United', null),
  ('2013/14', 1, 'Man City', null),
  ('2014/15', 1, 'Chelsea', null),
  ('2015/16', 1, 'Leicester', null),
  ('2016/17', 1, 'Chelsea', null),
  ('2017/18', 1, 'Man City', null),
  ('2018/19', 1, 'Man City', null),
  ('2019/20', 1, 'Liverpool', null),
  ('2020/21', 1, 'Man City', null),
  ('2021/22', 1, 'Man City', 93),
  ('2021/22', 2, 'Liverpool', 92),
  ('2021/22', 3, 'Chelsea', 74),
  ('2021/22', 4, 'Spurs', 71),
  ('2021/22', 5, 'Arsenal', 69),
  ('2021/22', 6, 'Man United', 58),
  ('2021/22', 7, 'West Ham', 56),
  ('2021/22', 8, 'Leicester', 52),
  ('2021/22', 9, 'Brighton', 51),
  ('2021/22', 10, 'Wolves', 51),
  ('2021/22', 11, 'Newcastle', 49),
  ('2021/22', 12, 'Crystal Palace', 48),
  ('2021/22', 13, 'Brentford', 46),
  ('2021/22', 14, 'Aston Villa', 45),
  ('2021/22', 15, 'Southampton', 40),
  ('2021/22', 16, 'Everton', 39),
  ('2021/22', 17, 'Leeds', 38),
  ('2021/22', 18, 'Burnley', 35),
  ('2021/22', 19, 'Watford', 23),
  ('2021/22', 20, 'Norwich', 22),
  ('2022/23', 1, 'Man City', 89),
  ('2022/23', 2, 'Arsenal', 84),
  ('2022/23', 3, 'Man United', 75),
  ('2022/23', 4, 'Newcastle', 71),
  ('2022/23', 5, 'Liverpool', 67),
  ('2022/23', 6, 'Brighton', 62),
  ('2022/23', 7, 'Aston Villa', 61),
  ('2022/23', 8, 'Spurs', 60),
  ('2022/23', 9, 'Brentford', 59),
  ('2022/23', 10, 'Fulham', 52),
  ('2022/23', 11, 'Crystal Palace', 45),
  ('2022/23', 12, 'Chelsea', 44),
  ('2022/23', 13, 'Wolves', 41),
  ('2022/23', 14, 'West Ham', 40),
  ('2022/23', 15, 'Bournemouth', 39),
  ('2022/23', 16, 'Nottingham Forest', 38),
  ('2022/23', 17, 'Everton', 36),
  ('2022/23', 18, 'Leicester', 34),
  ('2022/23', 19, 'Leeds', 31),
  ('2022/23', 20, 'Southampton', 25),
  ('2023/24', 1, 'Man City', 91),
  ('2023/24', 2, 'Arsenal', 89),
  ('2023/24', 3, 'Liverpool', 82),
  ('2023/24', 4, 'Aston Villa', 68),
  ('2023/24', 5, 'Spurs', 66),
  ('2023/24', 6, 'Chelsea', 63),
  ('2023/24', 7, 'Newcastle', 60),
  ('2023/24', 8, 'Man United', 60),
  ('2023/24', 9, 'West Ham', 52),
  ('2023/24', 10, 'Crystal Palace', 49),
  ('2023/24', 11, 'Brighton', 48),
  ('2023/24', 12, 'Bournemouth', 48),
  ('2023/24', 13, 'Fulham', 47),
  ('2023/24', 14, 'Wolves', 46),
  ('2023/24', 15, 'Everton', 40),
  ('2023/24', 16, 'Brentford', 39),
  ('2023/24', 17, 'Nottingham Forest', 32),
  ('2023/24', 18, 'Luton', 26),
  ('2023/24', 19, 'Burnley', 24),
  ('2023/24', 20, 'Sheffield United', 16),
  ('2024/25', 1, 'Liverpool', 84),
  ('2024/25', 2, 'Arsenal', 74),
  ('2024/25', 3, 'Man City', 71),
  ('2024/25', 4, 'Chelsea', 69),
  ('2024/25', 5, 'Newcastle', 66),
  ('2024/25', 6, 'Aston Villa', 66),
  ('2024/25', 7, 'Nottingham Forest', 65),
  ('2024/25', 8, 'Brighton', 61),
  ('2024/25', 9, 'Bournemouth', 56),
  ('2024/25', 10, 'Brentford', 56),
  ('2024/25', 11, 'Fulham', 54),
  ('2024/25', 12, 'Crystal Palace', 53),
  ('2024/25', 13, 'Everton', 48),
  ('2024/25', 14, 'West Ham', 43),
  ('2024/25', 15, 'Man United', 42),
  ('2024/25', 16, 'Wolves', 42),
  ('2024/25', 17, 'Spurs', 38),
  ('2024/25', 18, 'Leicester', 25),
  ('2024/25', 19, 'Ipswich', 22),
  ('2024/25', 20, 'Southampton', 12),
  ('2025/26', 1, 'Arsenal', 85),
  ('2025/26', 2, 'Man City', 78),
  ('2025/26', 3, 'Man United', 71),
  ('2025/26', 4, 'Aston Villa', 65),
  ('2025/26', 5, 'Liverpool', 60),
  ('2025/26', 6, 'Bournemouth', 57),
  ('2025/26', 7, 'Sunderland', 54),
  ('2025/26', 8, 'Brighton', 53),
  ('2025/26', 9, 'Brentford', 53),
  ('2025/26', 10, 'Chelsea', 52),
  ('2025/26', 11, 'Fulham', 52),
  ('2025/26', 12, 'Newcastle', 49),
  ('2025/26', 13, 'Everton', 49),
  ('2025/26', 14, 'Leeds', 47),
  ('2025/26', 15, 'Crystal Palace', 45),
  ('2025/26', 16, 'Nottingham Forest', 44),
  ('2025/26', 17, 'Spurs', 41),
  ('2025/26', 18, 'West Ham', 39),
  ('2025/26', 19, 'Burnley', 22),
  ('2025/26', 20, 'Wolves', 20);

insert into public.golden_boots (season, player, club, goals) values
  ('1992/93', 'Teddy Sheringham', 'Spurs', 22),
  ('1993/94', 'Andy Cole', 'Newcastle', 34),
  ('1994/95', 'Alan Shearer', 'Blackburn', 34),
  ('1995/96', 'Alan Shearer', 'Blackburn', 31),
  ('1996/97', 'Alan Shearer', 'Newcastle', 25),
  ('1997/98', 'Chris Sutton', 'Blackburn', 18),
  ('1997/98', 'Dion Dublin', 'Coventry', 18),
  ('1997/98', 'Michael Owen', 'Liverpool', 18),
  ('1998/99', 'Michael Owen', 'Liverpool', 18),
  ('1998/99', 'Dwight Yorke', 'Man United', 18),
  ('1998/99', 'Jimmy Floyd Hasselbaink', 'Leeds', 18),
  ('1999/00', 'Kevin Phillips', 'Sunderland', 30),
  ('2000/01', 'Jimmy Floyd Hasselbaink', 'Chelsea', 23),
  ('2001/02', 'Thierry Henry', 'Arsenal', 24),
  ('2002/03', 'Ruud van Nistelrooy', 'Man United', 25),
  ('2003/04', 'Thierry Henry', 'Arsenal', 30),
  ('2004/05', 'Thierry Henry', 'Arsenal', 25),
  ('2005/06', 'Thierry Henry', 'Arsenal', 27),
  ('2006/07', 'Didier Drogba', 'Chelsea', 20),
  ('2007/08', 'Cristiano Ronaldo', 'Man United', 31),
  ('2008/09', 'Nicolas Anelka', 'Chelsea', 19),
  ('2009/10', 'Didier Drogba', 'Chelsea', 29),
  ('2010/11', 'Carlos Tevez', 'Man City', 20),
  ('2010/11', 'Dimitar Berbatov', 'Man United', 20),
  ('2011/12', 'Robin van Persie', 'Arsenal', 30),
  ('2012/13', 'Robin van Persie', 'Man United', 26),
  ('2013/14', 'Luis Suárez', 'Liverpool', 31),
  ('2014/15', 'Sergio Agüero', 'Man City', 26),
  ('2015/16', 'Harry Kane', 'Spurs', 25),
  ('2016/17', 'Harry Kane', 'Spurs', 29),
  ('2017/18', 'Mohamed Salah', 'Liverpool', 32),
  ('2018/19', 'Pierre-Emerick Aubameyang', 'Arsenal', 22),
  ('2018/19', 'Sadio Mané', 'Liverpool', 22),
  ('2018/19', 'Mohamed Salah', 'Liverpool', 22),
  ('2019/20', 'Jamie Vardy', 'Leicester', 23),
  ('2020/21', 'Harry Kane', 'Spurs', 23),
  ('2021/22', 'Mohamed Salah', 'Liverpool', 23),
  ('2021/22', 'Son Heung-min', 'Spurs', 23),
  ('2022/23', 'Erling Haaland', 'Man City', 36),
  ('2023/24', 'Erling Haaland', 'Man City', 27),
  ('2024/25', 'Mohamed Salah', 'Liverpool', 29),
  ('2025/26', 'Erling Haaland', 'Man City', 27);

insert into public.club_captains (club, player, from_year, to_year) values
  ('Arsenal', 'Tony Adams', 1988, 2002),
  ('Arsenal', 'Patrick Vieira', 2002, 2005),
  ('Arsenal', 'Thierry Henry', 2005, 2007),
  ('Arsenal', 'William Gallas', 2007, 2008),
  ('Arsenal', 'Cesc Fàbregas', 2008, 2011),
  ('Arsenal', 'Robin van Persie', 2011, 2012),
  ('Arsenal', 'Thomas Vermaelen', 2012, 2014),
  ('Arsenal', 'Mikel Arteta', 2014, 2016),
  ('Arsenal', 'Per Mertesacker', 2016, 2018),
  ('Arsenal', 'Laurent Koscielny', 2018, 2019),
  ('Arsenal', 'Granit Xhaka', 2019, 2019),
  ('Arsenal', 'Pierre-Emerick Aubameyang', 2019, 2021),
  ('Arsenal', 'Alexandre Lacazette', 2021, 2022),
  ('Arsenal', 'Martin Ødegaard', 2022, null),
  ('Liverpool', 'Mark Wright', 1991, 1993),
  ('Liverpool', 'John Barnes', 1993, 1993),
  ('Liverpool', 'Ian Rush', 1993, 1996),
  ('Liverpool', 'John Barnes', 1996, 1997),
  ('Liverpool', 'Paul Ince', 1997, 1999),
  ('Liverpool', 'Jamie Redknapp', 1999, 2002),
  ('Liverpool', 'Sami Hyypiä', 2002, 2003),
  ('Liverpool', 'Steven Gerrard', 2003, 2015),
  ('Liverpool', 'Jordan Henderson', 2015, 2023),
  ('Liverpool', 'Virgil van Dijk', 2023, null),
  ('Man City', 'Steve Redmond', 1988, 1992),
  ('Man City', 'Terry Phelan', 1992, 1993),
  ('Man City', 'Keith Curle', 1993, 1996),
  ('Man City', 'Kit Symons', 1996, 1998),
  ('Man City', 'Jamie Pollock', 1998, 1998),
  ('Man City', 'Andy Morrison', 1998, 2000),
  ('Man City', 'Alf-Inge Haaland', 2000, 2001),
  ('Man City', 'Stuart Pearce', 2001, 2002),
  ('Man City', 'Ali Benarbia', 2002, 2003),
  ('Man City', 'Sylvain Distin', 2003, 2006),
  ('Man City', 'Richard Dunne', 2006, 2009),
  ('Man City', 'Kolo Touré', 2009, 2010),
  ('Man City', 'Carlos Tevez', 2010, 2011),
  ('Man City', 'Vincent Kompany', 2011, 2019),
  ('Man City', 'David Silva', 2019, 2020),
  ('Man City', 'Fernandinho', 2020, 2022),
  ('Man City', 'İlkay Gündoğan', 2022, 2023),
  ('Man City', 'Kyle Walker', 2023, 2025),
  ('Man City', 'Kevin De Bruyne', 2025, 2025),
  ('Man City', 'Bernardo Silva', 2025, 2026),
  ('Man City', 'Rúben Dias', 2026, null),
  ('Man United', 'Bryan Robson', 1982, 1994),
  ('Man United', 'Steve Bruce', 1994, 1996),
  ('Man United', 'Eric Cantona', 1996, 1997),
  ('Man United', 'Roy Keane', 1997, 2005),
  ('Man United', 'Gary Neville', 2005, 2010),
  ('Man United', 'Nemanja Vidić', 2010, 2014),
  ('Man United', 'Wayne Rooney', 2014, 2017),
  ('Man United', 'Michael Carrick', 2017, 2018),
  ('Man United', 'Antonio Valencia', 2018, 2019),
  ('Man United', 'Ashley Young', 2019, 2020),
  ('Man United', 'Harry Maguire', 2020, 2023),
  ('Man United', 'Bruno Fernandes', 2023, null);

insert into public.famous_results (played_on, home, home_goals, away_goals, away) values
  ('1995-03-04', 'Man United', 9, 0, 'Ipswich'),
  ('1996-10-20', 'Newcastle', 5, 0, 'Man United'),
  ('1996-04-03', 'Liverpool', 4, 3, 'Newcastle'),
  ('2001-09-29', 'Spurs', 3, 5, 'Man United'),
  ('2009-09-20', 'Man United', 4, 3, 'Man City'),
  ('2009-11-22', 'Spurs', 9, 1, 'Wigan'),
  ('2011-02-05', 'Newcastle', 4, 4, 'Arsenal'),
  ('2011-08-28', 'Man United', 8, 2, 'Arsenal'),
  ('2011-10-23', 'Man United', 1, 6, 'Man City'),
  ('2012-05-13', 'Man City', 3, 2, 'QPR'),
  ('2019-10-25', 'Southampton', 0, 9, 'Leicester'),
  ('2020-10-04', 'Aston Villa', 7, 2, 'Liverpool'),
  ('2020-10-04', 'Man United', 1, 6, 'Spurs'),
  ('2021-02-02', 'Man United', 9, 0, 'Southampton'),
  ('2022-08-27', 'Liverpool', 9, 0, 'Bournemouth'),
  ('2022-10-02', 'Man City', 6, 3, 'Man United'),
  ('2023-03-05', 'Liverpool', 7, 0, 'Man United'),
  ('2024-04-23', 'Arsenal', 5, 0, 'Chelsea');

insert into public.player_moments (player, moment, club, happened_on, born_on) values
  ('Wayne Rooney', 'first-goal', 'Everton', '2002-10-19', '1985-10-24'),
  ('Wayne Rooney', 'debut', 'Everton', '2002-08-17', '1985-10-24'),
  ('James Milner', 'first-goal', 'Leeds', '2002-12-26', '1986-01-04'),
  ('James Vaughan', 'first-goal', 'Everton', '2005-04-10', '1988-07-14'),
  ('Michael Owen', 'first-goal', 'Liverpool', '1997-05-06', '1979-12-14'),
  ('Ethan Nwaneri', 'debut', 'Arsenal', '2022-09-18', '2007-03-21'),
  ('Marcus Rashford', 'debut', 'Man United', '2016-02-28', '1997-10-31'),
  ('Trent Alexander-Arnold', 'debut', 'Liverpool', '2016-12-14', '1998-10-07'),
  ('Cristiano Ronaldo', 'debut', 'Man United', '2003-08-16', '1985-02-05'),
  ('Jack Wilshere', 'debut', 'Arsenal', '2008-09-13', '1992-01-01'),
  ('Harry Kane', 'first-goal', 'Spurs', '2014-04-07', '1993-07-28'),
  ('Raheem Sterling', 'first-goal', 'Liverpool', '2012-10-20', '1994-12-08'),
  ('Phil Foden', 'first-goal', 'Man City', '2019-04-20', '2000-05-28'),
  ('Bukayo Saka', 'first-goal', 'Arsenal', '2020-07-04', '2001-09-05');

