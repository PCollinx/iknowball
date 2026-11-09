import "server-only";
import { currentUserId, guestName } from "@/lib/daily/data";
import type { Club } from "@/lib/profile/club";
import { clubsByIds } from "@/lib/profile/data";
import { createAdminClient } from "@/lib/supabase/admin";
import { isTestSite } from "@/lib/daily/sample";
import { gapLine } from "./standing";
import { seasonStartsOn, seasonTable, seasonWeeks, type SeasonRow, type SeasonWeek } from "./season";
import { claimMine } from "./waitlist";
import { addDays, gameDate, gameDateClosesAt, matchweekBounds, seasonOf } from "@/lib/time";
import { fanbaseTable, movement, weekTable, type FanbaseRow, type WeekPart, type WeekRow, type WeekSprint } from "./week";

// The League reads straight from finished attempts: a past day can't change
// once the Daily has closed, so a week's table is final at Sunday midnight
// without a job to lock it.

/** Players in one league, at most. Also enforced by the league_cap trigger. */
export const LEAGUE_MAX = 50;
/** Fans a club needs playing in a week to appear on the fanbase table. */
export const FANBASE_MIN = 25;
/** Rows the global table shows above your own. */
export const GLOBAL_TOP = 20;

export type Week = { startsOn: string; endsOn: string; today: string };

export function currentWeek(): Week {
  const today = gameDate();
  return { ...matchweekBounds(today), today };
}

export type Player = { userId: string; name: string; club: Club | null };
/** moved: places gained (or lost, negative) since yesterday; null when new today or on a Monday. */
export type TableLine = WeekRow & Player & { mine: boolean; moved: number | null };
export type League = { id: number; name: string; invite_code: string; owner_id: string };

type AttemptJoin = {
  user_id: string;
  correct_count: number;
  started_at: string;
  submitted_at: string;
  dailies: { play_date: string; part: number; answer_count: number };
  profiles: { favourite_club_id: number | null } | null;
};

/** Rows per request: Supabase returns at most 1000 at a time. */
const PAGE = 1000;

/** Finished parts in the week, for everyone or for some players. */
async function weekParts(week: Week, userIds?: string[]): Promise<(WeekPart & { clubId: number | null })[]> {
  if (userIds && !userIds.length) return [];
  const rows: AttemptJoin[] = [];
  for (let from = 0; ; from += PAGE) {
    let q = createAdminClient()
      .from("attempts")
      .select("id, user_id, correct_count, started_at, submitted_at, dailies!inner(play_date, part, answer_count), profiles(favourite_club_id)")
      .gte("dailies.play_date", week.startsOn)
      .lte("dailies.play_date", week.endsOn)
      .not("submitted_at", "is", null)
      .order("id")
      .range(from, from + PAGE - 1);
    if (userIds) q = q.in("user_id", userIds);
    const { data, error } = await q;
    if (error) throw error;
    rows.push(...((data ?? []) as unknown as AttemptJoin[]));
    if (!data || data.length < PAGE) break;
  }
  return rows.map((a) => ({
    userId: a.user_id,
    playDate: a.dailies.play_date,
    part: a.dailies.part,
    correct: a.correct_count,
    answerCount: a.dailies.answer_count,
    seconds: Math.round((Date.parse(a.submitted_at) - Date.parse(a.started_at)) / 1000),
    clubId: a.profiles?.favourite_club_id ?? null,
  }));
}

/** Clash sprints started in the week, for everyone or for some players. */
async function weekSprints(week: Week, userIds?: string[]): Promise<(WeekSprint & { clubId: number | null })[]> {
  if (userIds && !userIds.length) return [];
  const from = gameDateClosesAt(addDays(week.startsOn, -1)).toISOString();
  const to = gameDateClosesAt(week.endsOn).toISOString();
  const rows: { user_id: string; right_count: number; started_at: string; profiles: { favourite_club_id: number | null } | null }[] = [];
  for (let start = 0; ; start += PAGE) {
    let q = createAdminClient()
      .from("clash_runs")
      .select("id, user_id, right_count, started_at, profiles(favourite_club_id)")
      .gte("started_at", from)
      .lt("started_at", to)
      .order("id")
      .range(start, start + PAGE - 1);
    if (userIds) q = q.in("user_id", userIds);
    const { data, error } = await q;
    if (error) throw error;
    rows.push(...((data ?? []) as unknown as typeof rows));
    if (!data || data.length < PAGE) break;
  }
  return rows.map((r) => ({ userId: r.user_id, right: r.right_count, playDate: gameDate(new Date(r.started_at)), clubId: r.profiles?.favourite_club_id ?? null }));
}

/** Everyone's week: Daily days plus Clash, with each player's club. */
async function everyoneWeek(week: Week) {
  const [parts, sprints] = await Promise.all([weekParts(week), weekSprints(week)]);
  return { rows: weekTable(parts, week.startsOn, sprints), clubOf: new Map([...sprints, ...parts].map((p) => [p.userId, p.clubId])) };
}

/** Names and clubs, for the shirts on a table. */
async function players(userIds: string[]): Promise<Map<string, Player>> {
  if (!userIds.length) return new Map();
  const { data, error } = await createAdminClient().from("profiles").select("id, username, favourite_club_id").in("id", userIds);
  if (error) throw error;
  const rows = data ?? [];
  const clubs = await clubsByIds([...new Set(rows.map((r) => r.favourite_club_id).filter((id): id is number => id !== null))]);
  return new Map(
    rows.map((r) => [
      r.id,
      { userId: r.id, name: r.username ?? guestName(r.id), club: r.favourite_club_id ? (clubs.get(r.favourite_club_id) ?? null) : null },
    ]),
  );
}

function withPlayers(rows: WeekRow[], people: Map<string, Player>, me: string | null, moved = new Map<string, number>()): TableLine[] {
  return rows.map((r) => ({
    ...r,
    ...(people.get(r.userId) ?? { userId: r.userId, name: guestName(r.userId), club: null }),
    mine: r.userId === me,
    moved: moved.get(r.userId) ?? null,
  }));
}

/** A league's member ids. */
async function memberIds(leagueId: number): Promise<string[]> {
  const { data, error } = await createAdminClient().from("league_members").select("user_id").eq("league_id", leagueId);
  if (error) throw error;
  return (data ?? []).map((m) => m.user_id);
}

/** A week's rows for every member: those yet to play sit at the bottom on 0. */
function membersRows(rows: WeekRow[], ids: string[], people: Map<string, Player>, me: string | null, moved?: Map<string, number>): TableLine[] {
  const played = new Set(rows.map((r) => r.userId));
  const bottom = rows.length + 1;
  const all: WeekRow[] = [
    ...rows,
    ...ids
      .filter((id) => !played.has(id))
      .map((userId) => ({ userId, days: Array(7).fill(null), counted: [], clash: 0, points: 0, seconds: 0, position: bottom })),
  ];
  return withPlayers(all, people, me, moved).sort((a, b) => a.position - b.position || a.name.localeCompare(b.name));
}

/** A league's members on this week's table. Members yet to play sit at the bottom on 0. */
async function membersTable(leagueId: number, week: Week, me: string | null): Promise<TableLine[]> {
  const ids = await memberIds(leagueId);
  const [parts, sprints, people] = await Promise.all([weekParts(week, ids), weekSprints(week, ids), players(ids)]);
  return membersRows(weekTable(parts, week.startsOn, sprints), ids, people, me, movement(parts, sprints, week.startsOn, week.today));
}

/** A season week on the matchweek strip, with your place in it (null when you didn't score). */
export type StripWeek = SeasonWeek & { position: number | null; current: boolean };
/** moved: places gained (or lost) since last week's close; null in the first week. */
export type SeasonLine = SeasonRow & Player & { mine: boolean; moved: number | null };

/** The first Monday this season's table counts from. */
export function seasonStart(today = gameDate()): string {
  return seasonStartsOn(seasonOf(today), isTestSite());
}

/** A league's whole season in one read: every week's table, this week's with
 * its daily movement, and the season table. Before the season starts, only this week. */
async function leagueSeason(leagueId: number, me: string | null) {
  const week = currentWeek();
  const weeks = seasonWeeks(seasonStart(week.today), week.today);
  const from = weeks[0]?.startsOn ?? week.startsOn;
  const ids = await memberIds(leagueId);
  const range = { startsOn: from, endsOn: week.endsOn, today: week.today };
  const [parts, sprints, people] = await Promise.all([weekParts(range, ids), weekSprints(range, ids), players(ids)]);
  const inWeek = <T extends { playDate: string }>(xs: T[], w: { startsOn: string; endsOn: string }) =>
    xs.filter((x) => x.playDate >= w.startsOn && x.playDate <= w.endsOn);
  const tables = weeks.map((w) => weekTable(inWeek(parts, w), w.startsOn, inWeek(sprints, w)));
  const nowParts = inWeek(parts, week);
  const nowSprints = inWeek(sprints, week);
  const current = membersRows(weekTable(nowParts, week.startsOn, nowSprints), ids, people, me, movement(nowParts, nowSprints, week.startsOn, week.today));

  const strip: StripWeek[] = weeks.map((w, i) => {
    const mine = me ? tables[i].find((r) => r.userId === me && r.points > 0) : undefined;
    return { ...w, position: mine?.position ?? null, current: w.startsOn === week.startsOn };
  });
  const season = seasonTable(tables);
  const before = new Map(seasonTable(tables.slice(0, -1)).map((r) => [r.userId, r.position]));
  const seasonLines: SeasonLine[] = season.map((r) => ({
    ...r,
    ...(people.get(r.userId) ?? { userId: r.userId, name: guestName(r.userId), club: null }),
    mine: r.userId === me,
    moved: tables.length > 1 && before.has(r.userId) ? before.get(r.userId)! - r.position : null,
  }));
  /** A finished or current week's table for every member. */
  const weekRows = (n: number): TableLine[] => (n === weeks.length ? current : membersRows(tables[n - 1] ?? [], ids, people, me));
  return { week, ids, strip, current, season: seasonLines, weekRows };
}

export async function leagueByCode(code: string): Promise<League | null> {
  const { data, error } = await createAdminClient().from("leagues").select("id, name, invite_code, owner_id").eq("invite_code", code).maybeSingle();
  if (error) throw error;
  return data;
}

/** What a member's page shows: one matchweek (this one or a finished one) or the season. */
export type LeagueShown =
  | { kind: "week"; n: number | null; week: Week; rows: TableLine[]; final: boolean }
  | { kind: "season"; rows: SeasonLine[]; weeks: number };

/** `captain` is the owner's name: the owner wears the armband. `rows` is this week's table. */
export type LeagueView =
  | { kind: "missing" }
  | { kind: "invite"; league: League; week: Week; rows: TableLine[]; captain: string; full: boolean }
  | { kind: "table"; league: League; week: Week; rows: TableLine[]; captain: string; owner: boolean; strip: StripWeek[]; shown: LeagueShown; seasonPlace: number | null };

/** A league's page: its table for members, an invite to join for anyone else.
 * `pick` is the ?w= on the address: a week's number or "season"; anything else shows this week. */
export async function getLeagueView(code: string, pick?: string): Promise<LeagueView> {
  const [league, me] = await Promise.all([leagueByCode(code), currentUserId()]);
  if (!league) return { kind: "missing" };
  const { week, current, strip, season, weekRows } = await leagueSeason(league.id, me);
  const captain = current.find((r) => r.userId === league.owner_id)?.name ?? "The owner";
  if (!me || !current.some((r) => r.userId === me)) return { kind: "invite", league, week, rows: current, captain, full: current.length >= LEAGUE_MAX };

  const n = Number(pick);
  const picked = Number.isInteger(n) ? strip.find((w) => w.n === n && !w.current) : undefined;
  const shown: LeagueShown =
    pick === "season" && strip.length
      ? { kind: "season", rows: season, weeks: strip.length }
      : picked
        ? { kind: "week", n: picked.n, week: { startsOn: picked.startsOn, endsOn: picked.endsOn, today: picked.endsOn }, rows: weekRows(picked.n), final: true }
        : { kind: "week", n: strip.at(-1)?.current ? strip.at(-1)!.n : null, week, rows: current, final: false };
  const seasonPlace = season.find((r) => r.mine)?.position ?? null;
  return { kind: "table", league, week, rows: current, captain, owner: league.owner_id === me, strip, shown, seasonPlace };
}

/** One of your leagues on the hub: your place, its top three, and how far you are from the next place that matters. */
export type HubLine = {
  league: League;
  members: number;
  position: number | null;
  points: number;
  moved: number | null;
  top: TableLine[];
  gap: string;
  /** Where you finished last week and stand on the season, when you scored. */
  lastWeek: { position: number; points: number } | null;
  season: { position: number; points: number } | null;
};

/** Your leagues with this week's place in each, plus your place on the global table. */
export type Hub = {
  week: Week;
  leagues: HubLine[];
  everyone: { position: number | null; players: number; points: number; moved: number | null };
  club: Club | null;
  /** Your club's place among clubs with enough fans playing, if it has a place. */
  fanbase: { position: number | null; clubs: number };
};

export async function getHub(): Promise<Hub> {
  const [me] = await Promise.all([currentUserId(), claimMine()]);
  const week = currentWeek();
  const none = { week, leagues: [], everyone: { position: null, players: 0, points: 0, moved: null }, club: null, fanbase: { position: null, clubs: 0 } };
  if (!me) return none;
  const admin = createAdminClient();
  const [{ data, error }, parts, sprints, people] = await Promise.all([
    admin.from("league_members").select("leagues(id, name, invite_code, owner_id)").eq("user_id", me).order("joined_at"),
    weekParts(week),
    weekSprints(week),
    players([me]),
  ]);
  const everyone = weekTable(parts, week.startsOn, sprints);
  const clubOf = new Map([...sprints, ...parts].map((p) => [p.userId, p.clubId]));
  const fans = fanbaseTable(everyone.map((r) => ({ points: r.points, clubId: clubOf.get(r.userId) ?? null })), FANBASE_MIN);
  const club = people.get(me)?.club ?? null;
  if (error) throw error;
  const leagues = ((data ?? []) as unknown as { leagues: League | null }[]).map((m) => m.leagues).filter((l): l is League => l !== null);
  const lines = await Promise.all(
    leagues.map(async (league) => {
      const { current: rows, strip, season, weekRows } = await leagueSeason(league.id, me);
      const mine = rows.find((r) => r.mine);
      const last = strip.length > 1 ? weekRows(strip.length - 1).find((r) => r.mine && r.points > 0) : undefined;
      const inSeason = season.find((r) => r.mine);
      return {
        league,
        members: rows.length,
        position: mine && mine.points > 0 ? mine.position : null,
        points: mine?.points ?? 0,
        moved: mine?.moved ?? null,
        top: rows.slice(0, 3),
        gap: gapLine(rows),
        lastWeek: last ? { position: last.position, points: last.points } : null,
        season: inSeason ? { position: inSeason.position, points: inSeason.points } : null,
      };
    }),
  );
  const mine = everyone.find((r) => r.userId === me);
  return {
    week,
    leagues: lines,
    everyone: {
      position: mine?.position ?? null,
      players: everyone.length,
      points: mine?.points ?? 0,
      moved: movement(parts, sprints, week.startsOn, week.today).get(me) ?? null,
    },
    club,
    fanbase: { position: fans.find((f) => f.clubId === club?.id)?.position ?? null, clubs: fans.length },
  };
}

/** Everyone who played this week: the top of the table plus your own row. */
export async function getGlobalTable(): Promise<{ week: Week; top: TableLine[]; mine: TableLine | null; myClub: Club | null; players: number }> {
  const [me, week] = [await currentUserId(), currentWeek()];
  const { rows } = await everyoneWeek(week);
  const myRow = rows.find((r) => r.userId === me) ?? null;
  const shown = rows.slice(0, GLOBAL_TOP);
  const people = await players([...new Set([...shown.map((r) => r.userId), ...(me ? [me] : [])])]);
  const top = withPlayers(shown, people, me);
  return {
    week,
    top,
    mine: myRow && myRow.position > GLOBAL_TOP ? withPlayers([myRow], people, me)[0] : null,
    myClub: me ? (people.get(me)?.club ?? null) : null,
    players: rows.length,
  };
}

export type FanbaseLine = FanbaseRow & { club: Club; mine: boolean };

/** Clubs ranked by their fans' average week. */
export async function getFanbaseTable(): Promise<{ week: Week; rows: FanbaseLine[]; myClub: Club | null; myClubFans: number; minFans: number }> {
  const [me, week] = [await currentUserId(), currentWeek()];
  const { rows, clubOf } = await everyoneWeek(week);
  const ranked = fanbaseTable(rows.map((r) => ({ points: r.points, clubId: clubOf.get(r.userId) ?? null })), FANBASE_MIN);
  const myClubId = me ? ((await players([me])).get(me)?.club?.id ?? null) : null;
  const clubs = await clubsByIds([...new Set([...ranked.map((r) => r.clubId), ...(myClubId ? [myClubId] : [])])]);
  return {
    week,
    rows: ranked.map((r) => ({ ...r, club: clubs.get(r.clubId)!, mine: r.clubId === myClubId })).filter((r) => r.club),
    myClub: myClubId ? (clubs.get(myClubId) ?? null) : null,
    myClubFans: myClubId ? rows.filter((r) => clubOf.get(r.userId) === myClubId).length : 0,
    minFans: FANBASE_MIN,
  };
}

/** A row on the home page's League board. `points` is a fanbase's average on the fans tab. */
export type BoardRow = { key: string; position: number; name: string; points: number; mine: boolean };

/** One tab of the home page's League board: the top three, your row and your place. */
export type BoardTab = {
  key: string;
  kind: "league" | "everyone" | "fans";
  label: string;
  /** The full table, opened from the scoreboard block. */
  href: string;
  top: BoardRow[];
  mine: BoardRow | null;
  /** Places gained (or lost) since yesterday; null on the fans tab, when new today or on a Monday. */
  moved: number | null;
  /** Players (or clubs) on the table. */
  size: number;
};

const BOARD_TOP = 3;

function boardRow(r: TableLine): BoardRow {
  return { key: r.userId, position: r.position, name: r.mine ? "You" : r.name, points: r.points, mine: r.mine };
}

/** The home page's League board: a tab per league you're in, then Everyone and your club's fans. */
export async function getHomeBoard(me: string | null): Promise<{ tabs: BoardTab[]; club: Club | null }> {
  if (me) await claimMine();
  const week = currentWeek();
  const [memberships, parts, sprints] = await Promise.all([
    me
      ? createAdminClient().from("league_members").select("leagues(id, name, invite_code, owner_id)").eq("user_id", me).order("joined_at")
      : Promise.resolve({ data: [], error: null }),
    weekParts(week),
    weekSprints(week),
  ]);
  if (memberships.error) throw memberships.error;
  const leagues = ((memberships.data ?? []) as unknown as { leagues: League | null }[])
    .map((m) => m.leagues)
    .filter((l): l is League => l !== null);

  // Everyone: the same week table as /league/everyone, with places moved since yesterday.
  const everyone = weekTable(parts, week.startsOn, sprints);
  const moved = movement(parts, sprints, week.startsOn, week.today);
  const myRow = everyone.find((r) => r.userId === me) ?? null;
  const shown = everyone.slice(0, BOARD_TOP);

  // Fans: clubs ranked by their fans' average week, as on /league/fans.
  const clubOf = new Map([...sprints, ...parts].map((p) => [p.userId, p.clubId]));
  const fans = fanbaseTable(everyone.map((r) => ({ points: r.points, clubId: clubOf.get(r.userId) ?? null })), FANBASE_MIN);

  const [people, leagueTables] = await Promise.all([
    players([...new Set([...shown, ...(myRow ? [myRow] : [])].map((r) => r.userId).concat(me ? [me] : []))]),
    Promise.all(leagues.map((l) => membersTable(l.id, week, me))),
  ]);
  const club = me ? (people.get(me)?.club ?? null) : null;
  const myFans = fans.find((f) => f.clubId === club?.id) ?? null;
  const clubs = await clubsByIds([...new Set([...fans.slice(0, BOARD_TOP), ...(myFans ? [myFans] : [])].map((f) => f.clubId))]);
  const fanRow = (f: FanbaseRow): BoardRow => ({
    key: String(f.clubId),
    position: f.position,
    name: clubs.get(f.clubId)?.name ?? "Club",
    points: Math.round(f.average),
    mine: f.clubId === club?.id,
  });
  const everyoneLines = withPlayers([...shown, ...(myRow && myRow.position > BOARD_TOP ? [myRow] : [])], people, me, moved);

  return {
    club,
    tabs: [
      ...leagues.map((league, i): BoardTab => {
        const rows = leagueTables[i];
        const mine = rows.find((r) => r.mine) ?? null;
        return {
          key: `league-${league.id}`,
          kind: "league",
          label: league.name,
          href: `/league/${league.invite_code}`,
          top: rows.slice(0, BOARD_TOP).map(boardRow),
          mine: mine ? boardRow(mine) : null,
          moved: mine?.moved ?? null,
          size: rows.length,
        };
      }),
      {
        key: "everyone",
        kind: "everyone",
        label: "Everyone",
        href: "/league/everyone",
        top: everyoneLines.filter((r) => r.position <= BOARD_TOP).map(boardRow),
        mine: myRow ? boardRow(everyoneLines.find((r) => r.mine)!) : null,
        moved: me ? (moved.get(me) ?? null) : null,
        size: everyone.length,
      },
      {
        key: "fans",
        kind: "fans",
        label: "Fans",
        href: "/league/fans",
        top: fans.slice(0, BOARD_TOP).map(fanRow),
        mine: myFans ? fanRow(myFans) : null,
        moved: null,
        size: fans.length,
      },
    ],
  };
}

/** This week's Premier League matchweek (the highest round with a fixture in it), or null in a week with none. */
export async function weekRound(week: Week): Promise<number | null> {
  const { data, error } = await createAdminClient()
    .from("fixtures")
    .select("pl_round")
    .gte("kickoff_at", gameDateClosesAt(addDays(week.startsOn, -1)).toISOString())
    .lt("kickoff_at", gameDateClosesAt(week.endsOn).toISOString())
    .not("pl_round", "is", null)
    .order("pl_round", { ascending: false })
    .limit(1);
  if (error) throw error;
  return data?.[0]?.pl_round ?? null;
}

/** A player's best finish in a league last week, for Monday's whistle. */
export type LeagueFinish = { league: League; position: number; points: number; leader: { name: string; points: number } | null };

/**
 * Last week's finish in each of these players' leagues, the best one each
 * (highest place, then the bigger league). Only players who scored count;
 * the leader is whoever topped it, unless that's you.
 */
export async function lastWeekFinishes(userIds: string[]): Promise<Map<string, LeagueFinish>> {
  const best = new Map<string, LeagueFinish & { members: number }>();
  if (!userIds.length) return best;
  const admin = createAdminClient();
  const memberships: { league_id: number }[] = [];
  for (let i = 0; i < userIds.length; i += 200) {
    const { data, error } = await admin.from("league_members").select("league_id").in("user_id", userIds.slice(i, i + 200));
    if (error) throw error;
    memberships.push(...(data ?? []));
  }
  const ids = [...new Set(memberships.map((m) => m.league_id))];
  if (!ids.length) return best;
  const { data: leagues, error } = await admin.from("leagues").select("id, name, invite_code, owner_id").in("id", ids);
  if (error) throw error;
  const { startsOn } = currentWeek();
  const last: Week = { startsOn: addDays(startsOn, -7), endsOn: addDays(startsOn, -1), today: addDays(startsOn, -1) };
  const wanted = new Set(userIds);
  for (const league of leagues ?? []) {
    const rows = await membersTable(league.id, last, null);
    const top = rows[0];
    for (const r of rows) {
      if (!wanted.has(r.userId) || r.points <= 0) continue;
      const leader = top && top.userId !== r.userId && top.points > 0 ? { name: top.name, points: top.points } : null;
      const line = { league, position: r.position, points: r.points, leader, members: rows.length };
      const had = best.get(r.userId);
      if (!had || line.position < had.position || (line.position === had.position && line.members > had.members)) best.set(r.userId, line);
    }
  }
  return best;
}
