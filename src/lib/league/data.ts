import "server-only";
import { currentUserId, guestName } from "@/lib/daily/data";
import type { Club } from "@/lib/profile/club";
import { clubsByIds } from "@/lib/profile/data";
import { createAdminClient } from "@/lib/supabase/admin";
import { addDays, gameDate, gameDateClosesAt, matchweekBounds } from "@/lib/time";
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

/** A league's members on this week's table. Members yet to play sit at the bottom on 0. */
async function membersTable(leagueId: number, week: Week, me: string | null): Promise<TableLine[]> {
  const { data, error } = await createAdminClient().from("league_members").select("user_id").eq("league_id", leagueId);
  if (error) throw error;
  const ids = (data ?? []).map((m) => m.user_id);
  const [parts, sprints, people] = await Promise.all([weekParts(week, ids), weekSprints(week, ids), players(ids)]);
  const rows = weekTable(parts, week.startsOn, sprints);
  const moved = movement(parts, sprints, week.startsOn, week.today);
  const played = new Set(rows.map((r) => r.userId));
  const idle = ids.filter((id) => !played.has(id));
  const bottom = rows.length + 1;
  const all: WeekRow[] = [
    ...rows,
    ...idle.map((userId) => ({ userId, days: Array(7).fill(null), counted: [], clash: 0, points: 0, seconds: 0, position: bottom })),
  ];
  return withPlayers(all, people, me, moved).sort((a, b) => a.position - b.position || a.name.localeCompare(b.name));
}

export async function leagueByCode(code: string): Promise<League | null> {
  const { data, error } = await createAdminClient().from("leagues").select("id, name, invite_code, owner_id").eq("invite_code", code).maybeSingle();
  if (error) throw error;
  return data;
}

export type LeagueView =
  | { kind: "missing" }
  | { kind: "invite"; league: League; members: Player[]; full: boolean }
  | { kind: "table"; league: League; week: Week; rows: TableLine[]; owner: boolean };

/** A league's page: its table for members, an invite to join for anyone else. */
export async function getLeagueView(code: string): Promise<LeagueView> {
  const [league, me] = await Promise.all([leagueByCode(code), currentUserId()]);
  if (!league) return { kind: "missing" };
  const week = currentWeek();
  const rows = await membersTable(league.id, week, me);
  if (!me || !rows.some((r) => r.userId === me)) return { kind: "invite", league, members: rows.map(({ userId, name, club }) => ({ userId, name, club })), full: rows.length >= LEAGUE_MAX };
  return { kind: "table", league, week, rows, owner: league.owner_id === me };
}

export type HubLine = { league: League; members: number; position: number | null; points: number };

/** Your leagues with this week's place in each, plus your place on the global table. */
export type Hub = {
  week: Week;
  leagues: HubLine[];
  everyone: { position: number | null; players: number; points: number };
  club: Club | null;
  /** Your club's place among clubs with enough fans playing, if it has a place. */
  fanbase: { position: number | null; clubs: number };
};

export async function getHub(): Promise<Hub> {
  const me = await currentUserId();
  const week = currentWeek();
  const none = { week, leagues: [], everyone: { position: null, players: 0, points: 0 }, club: null, fanbase: { position: null, clubs: 0 } };
  if (!me) return none;
  const admin = createAdminClient();
  const [{ data, error }, { rows: everyone, clubOf }, people] = await Promise.all([
    admin.from("league_members").select("leagues(id, name, invite_code, owner_id)").eq("user_id", me).order("joined_at"),
    everyoneWeek(week),
    players([me]),
  ]);
  const fans = fanbaseTable(everyone.map((r) => ({ points: r.points, clubId: clubOf.get(r.userId) ?? null })), FANBASE_MIN);
  const club = people.get(me)?.club ?? null;
  if (error) throw error;
  const leagues = ((data ?? []) as unknown as { leagues: League | null }[]).map((m) => m.leagues).filter((l): l is League => l !== null);
  const lines = await Promise.all(
    leagues.map(async (league) => {
      const rows = await membersTable(league.id, week, me);
      const mine = rows.find((r) => r.mine);
      return { league, members: rows.length, position: mine && mine.points > 0 ? mine.position : null, points: mine?.points ?? 0 };
    }),
  );
  const mine = everyone.find((r) => r.userId === me);
  return {
    week,
    leagues: lines,
    everyone: { position: mine?.position ?? null, players: everyone.length, points: mine?.points ?? 0 },
    club,
    fanbase: { position: fans.find((f) => f.clubId === club?.id)?.position ?? null, clubs: fans.length },
  };
}

/** Everyone who played this week: the top of the table plus your own row. */
export async function getGlobalTable(): Promise<{ week: Week; top: TableLine[]; mine: TableLine | null; players: number }> {
  const [me, week] = [await currentUserId(), currentWeek()];
  const { rows } = await everyoneWeek(week);
  const myRow = rows.find((r) => r.userId === me) ?? null;
  const shown = rows.slice(0, GLOBAL_TOP);
  const people = await players([...new Set([...shown, ...(myRow ? [myRow] : [])].map((r) => r.userId))]);
  const top = withPlayers(shown, people, me);
  return { week, top, mine: myRow && myRow.position > GLOBAL_TOP ? withPlayers([myRow], people, me)[0] : null, players: rows.length };
}

export type FanbaseLine = FanbaseRow & { club: Club; mine: boolean };

/** Clubs ranked by their fans' average week. */
export async function getFanbaseTable(): Promise<{ week: Week; rows: FanbaseLine[]; myClub: Club | null; minFans: number }> {
  const [me, week] = [await currentUserId(), currentWeek()];
  const { rows, clubOf } = await everyoneWeek(week);
  const ranked = fanbaseTable(rows.map((r) => ({ points: r.points, clubId: clubOf.get(r.userId) ?? null })), FANBASE_MIN);
  const myClubId = me ? ((await players([me])).get(me)?.club?.id ?? null) : null;
  const clubs = await clubsByIds([...new Set([...ranked.map((r) => r.clubId), ...(myClubId ? [myClubId] : [])])]);
  return {
    week,
    rows: ranked.map((r) => ({ ...r, club: clubs.get(r.clubId)!, mine: r.clubId === myClubId })).filter((r) => r.club),
    myClub: myClubId ? (clubs.get(myClubId) ?? null) : null,
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
