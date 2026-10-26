import "server-only";
import type { Club } from "@/lib/profile/club";
import { CLUB_COLUMNS } from "@/lib/profile/data";
import { createAdminClient } from "@/lib/supabase/admin";
import { addDays } from "@/lib/time";
import { currentWeek, FANBASE_MIN, type FanbaseLine, type Hub, type HubLine, type League, type LeagueView, type TableLine, type Week } from "./data";
import { gapLine } from "./standing";
import { COUNTED_DAYS } from "./week";

// Test sites only: the League with sample data, so every screen can be seen
// and clicked through (Collins tests them before they go). Start on
// /league?preview=hub (or ?preview=first for a first visit): its stickers
// open each sample league, and Everyone and Fans open sample rankings.
// /league/{ANY CODE}?preview=invite shows a league to someone not in it.
// Nothing is written to the shared dev database; the start and join forms
// stay real, so a league made there is a real one on dev.

export const HUB_PREVIEWS = ["hub", "first"] as const;
export const LEAGUE_PREVIEWS = ["table", "invite"] as const;
export const isHubPreview = (v: unknown): v is (typeof HUB_PREVIEWS)[number] => HUB_PREVIEWS.includes(v as never);
export const isLeaguePreview = (v: unknown): v is (typeof LEAGUE_PREVIEWS)[number] => LEAGUE_PREVIEWS.includes(v as never);
/** Everyone and Fans take ?preview=1. */
export const isRankPreview = (v: unknown) => v === "1";

type Sample = { name: string; club: string | null; days: (number | null)[]; clash: number; moved: number; mine?: boolean };

// A Saturday: Sunday still to play. Day scores out of 100, null = not played.
const YABA: Sample[] = [
  { name: "tunde", club: "ARS", days: [70, 62, null, 58, 66, 54, null], clash: 30, moved: 0 },
  { name: "You", club: "CHE", days: [60, null, 71, 55, 64, null, null], clash: 62, moved: 1, mine: true },
  { name: "ada_b", club: "MUN", days: [55, 58, 60, 52, 49, 47, null], clash: 24, moved: -1 },
  { name: "femi.o", club: "TOT", days: [66, null, null, 70, 58, null, null], clash: 31, moved: 2 },
  { name: "chi", club: "LIV", days: [40, 45, 50, null, null, 38, null], clash: 20, moved: -1 },
  { name: "dami", club: "NEW", days: [null, 80, null, null, null, 77, null], clash: 0, moved: 0 },
  { name: "Guest 4F2A", club: null, days: [33, null, null, null, null, null, null], clash: 12, moved: 0 },
  { name: "bisi", club: "ARS", days: [null, null, null, null, null, null, null], clash: 0, moved: 0 },
];

const SUNDAY: Sample[] = [
  { name: "kels", club: "NEW", days: [80, 74, 69, 77, 71, null, null], clash: 55, moved: 0 },
  { name: "femi.o", club: "TOT", days: [66, 70, 72, 70, 58, 61, null], clash: 31, moved: 1 },
  { name: "Guest 9B1C", club: "ARS", days: [62, 59, 64, 66, null, 70, null], clash: 40, moved: -1 },
  { name: "ngozi", club: "MCI", days: [58, 61, null, 63, 57, 60, null], clash: 28, moved: 3 },
  { name: "segun", club: "AVL", days: [55, null, 60, 58, 62, 51, null], clash: 22, moved: 0 },
  { name: "You", club: "CHE", days: [40, null, 35, null, null, null, null], clash: 18, moved: -2, mine: true },
  { name: "uche", club: "MUN", days: [null, 52, null, 48, null, null, null], clash: 10, moved: -1 },
  { name: "lola", club: "LIV", days: [44, null, null, null, null, null, null], clash: 0, moved: 0 },
];

const OKAFORS: Sample[] = [
  { name: "You", club: "CHE", days: [60, null, 71, 55, 64, null, null], clash: 62, moved: 0, mine: true },
  { name: "dad", club: "MUN", days: [55, 58, 60, 52, 49, 47, null], clash: 24, moved: 0 },
  { name: "chi", club: "LIV", days: [40, 45, 50, null, null, 38, null], clash: 20, moved: 1 },
  { name: "ify", club: null, days: [null, null, null, null, null, null, null], clash: 0, moved: 0 },
];

/** The sample leagues by code; the first player is captain. */
const LEAGUES: { league: League; players: Sample[] }[] = [
  { league: { id: -1, name: "Yaba Ballers", invite_code: "K7Q2XY", owner_id: "" }, players: YABA },
  { league: { id: -2, name: "Sunday League Legends", invite_code: "SUN9LG", owner_id: "" }, players: SUNDAY },
  { league: { id: -3, name: "The Okafors", invite_code: "OKA4F5", owner_id: "" }, players: OKAFORS },
];

/** A Saturday in this week, so the form guide has days played and days to come. */
function saturday(): Week {
  const now = currentWeek();
  return { ...now, today: addDays(now.startsOn, 5) };
}

async function clubs(): Promise<Map<string, Club>> {
  const { data, error } = await createAdminClient().from("clubs").select(CLUB_COLUMNS).eq("fan_pick", true);
  if (error) throw error;
  return new Map(((data ?? []) as Club[]).map((c) => [c.short_name, c]));
}

const sampleId = (league: number, i: number) => `00000000-0000-0000-${String(-league).padStart(4, "0")}-${String(i).padStart(12, "0")}`;

function rowsOf(kits: Map<string, Club>, league: League, players: Sample[]): TableLine[] {
  return players
    .map((p, i) => {
      const counted = p.days
        .map((v, d) => [v, d] as const)
        .filter(([v]) => v !== null)
        .sort((a, b) => b[0]! - a[0]!)
        .slice(0, COUNTED_DAYS)
        .map(([, d]) => d);
      return {
        userId: sampleId(league.id, i),
        name: p.name,
        club: p.club ? (kits.get(p.club) ?? null) : null,
        days: p.days,
        counted,
        clash: p.clash,
        points: counted.reduce((sum, d) => sum + p.days[d]!, 0) + p.clash,
        seconds: 0,
        position: 0,
        mine: Boolean(p.mine),
        moved: p.moved || null,
      };
    })
    .sort((a, b) => b.points - a.points)
    .map((r, i) => ({ ...r, position: i + 1 }));
}

function sampleLeague(code: string) {
  const found = LEAGUES.find((l) => l.league.invite_code === code) ?? LEAGUES[0];
  return { league: { ...found.league, owner_id: sampleId(found.league.id, 0) }, players: found.players };
}

export async function previewLeague(kind: (typeof LEAGUE_PREVIEWS)[number], code: string): Promise<LeagueView> {
  const { league, players } = sampleLeague(code);
  const rows = rowsOf(await clubs(), league, players);
  const captain = rows.find((r) => r.userId === league.owner_id)!.name;
  if (kind === "invite") {
    // Someone not in it: "You" is a friend's name instead.
    const outside = rows.map((r) => (r.mine ? { ...r, name: "paul.c", mine: false } : r));
    return { kind: "invite", league, week: saturday(), rows: outside, captain, full: false };
  }
  return { kind: "table", league, week: saturday(), rows, captain, owner: false };
}

export async function previewHub(kind: (typeof HUB_PREVIEWS)[number]): Promise<Hub> {
  const week = currentWeek();
  if (kind === "first") {
    return { week, leagues: [], everyone: { position: null, players: 2316, points: 0, moved: null }, club: null, fanbase: { position: null, clubs: 9 } };
  }
  const kits = await clubs();
  const leagues: HubLine[] = LEAGUES.map(({ league: l }) => {
    const { league, players } = sampleLeague(l.invite_code);
    const rows = rowsOf(kits, league, players);
    const mine = rows.find((r) => r.mine)!;
    return { league, members: rows.length, position: mine.position, points: mine.points, moved: mine.moved, top: rows.slice(0, 3), gap: gapLine(rows) };
  });
  return {
    week,
    leagues,
    everyone: { position: 418, players: 2316, points: leagues[0].points, moved: 37 },
    club: kits.get("CHE") ?? null,
    fanbase: { position: 4, clubs: 9 },
  };
}

const NAMES = ["kels", "tunde", "Guest 9B1C", "ngozi", "femi.o", "segun", "ada_b", "uche", "lola", "dami", "chi", "Guest 2D7E", "bisi", "kemi", "yemi", "Guest 5A0F", "tobi", "seun", "ify", "dayo"];

/** Everyone's week: the top 20, then your row further down. */
export async function previewEveryone(): Promise<{ week: Week; top: TableLine[]; mine: TableLine | null; players: number }> {
  const kits = [...(await clubs()).values()];
  const line = (name: string, points: number, position: number, mine = false): TableLine => ({
    userId: `sample-${position}`,
    name,
    club: kits[position % kits.length] ?? null,
    days: Array(7).fill(null),
    counted: [],
    clash: 0,
    points,
    seconds: 0,
    position,
    mine,
    moved: null,
  });
  const top = NAMES.map((name, i) => line(name, 512 - i * 9, i + 1));
  return { week: currentWeek(), top, mine: line("You", 312, 418, true), players: 2316 };
}

/** Clubs by their fans' average week, with Chelsea as your club. */
export async function previewFans(): Promise<{ week: Week; rows: FanbaseLine[]; myClub: Club | null; minFans: number }> {
  const kits = await clubs();
  const order = ["ARS", "LIV", "MUN", "CHE", "TOT", "NEW", "MCI", "AVL", "EVE"].filter((c) => kits.has(c));
  const rows = order.map((short, i) => {
    const club = kits.get(short)!;
    return { clubId: club.id, fans: 180 - i * 15, average: 301 - i * 11, position: i + 1, club, mine: short === "CHE" };
  });
  return { week: currentWeek(), rows, myClub: kits.get("CHE") ?? null, minFans: FANBASE_MIN };
}
