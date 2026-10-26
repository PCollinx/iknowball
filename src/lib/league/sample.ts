import "server-only";
import type { Club } from "@/lib/profile/club";
import { CLUB_COLUMNS } from "@/lib/profile/data";
import { createAdminClient } from "@/lib/supabase/admin";
import { addDays } from "@/lib/time";
import { currentWeek, type Hub, type League, type LeagueView, type TableLine } from "./data";
import { gapLine } from "./standing";
import { COUNTED_DAYS } from "./week";

// Test sites only: the League with sample data, so the hub and a league's
// page can be seen in every state (Collins tests them before they go).
// /league?preview=hub|first and /league/{ANY CODE}?preview=table|invite.
// Nothing is written to the shared dev database.

export const HUB_PREVIEWS = ["hub", "first"] as const;
export const LEAGUE_PREVIEWS = ["table", "invite"] as const;
export const isHubPreview = (v: unknown): v is (typeof HUB_PREVIEWS)[number] => HUB_PREVIEWS.includes(v as never);
export const isLeaguePreview = (v: unknown): v is (typeof LEAGUE_PREVIEWS)[number] => LEAGUE_PREVIEWS.includes(v as never);

// A Saturday: Sunday still to play. Day scores out of 100, null = not played.
const PLAYERS: { name: string; club: string | null; days: (number | null)[]; clash: number; moved: number; mine?: boolean; owner?: boolean }[] = [
  { name: "tunde", club: "ARS", days: [70, 62, null, 58, 66, 54, null], clash: 30, moved: 0, owner: true },
  { name: "You", club: "CHE", days: [60, null, 71, 55, 64, null, null], clash: 62, moved: 1, mine: true },
  { name: "ada_b", club: "MUN", days: [55, 58, 60, 52, 49, 47, null], clash: 24, moved: -1 },
  { name: "femi.o", club: "TOT", days: [66, null, null, 70, 58, null, null], clash: 31, moved: 2 },
  { name: "chi", club: "LIV", days: [40, 45, 50, null, null, 38, null], clash: 20, moved: -1 },
  { name: "dami", club: "NEW", days: [null, 80, null, null, null, 77, null], clash: 0, moved: 0 },
  { name: "Guest 4F2A", club: null, days: [33, null, null, null, null, null, null], clash: 12, moved: 0 },
  { name: "bisi", club: "ARS", days: [null, null, null, null, null, null, null], clash: 0, moved: 0 },
];

async function clubs(): Promise<Map<string, Club>> {
  const { data, error } = await createAdminClient().from("clubs").select(CLUB_COLUMNS).in("short_name", ["ARS", "CHE", "MUN", "TOT", "LIV", "NEW"]);
  if (error) throw error;
  return new Map(((data ?? []) as Club[]).map((c) => [c.short_name, c]));
}

function sampleRows(kits: Map<string, Club>, players = PLAYERS): TableLine[] {
  return players
    .map((p, i) => {
      const counted = p.days
        .map((v, d) => [v, d] as const)
        .filter(([v]) => v !== null)
        .sort((a, b) => b[0]! - a[0]!)
        .slice(0, COUNTED_DAYS)
        .map(([, d]) => d);
      const points = counted.reduce((sum, d) => sum + p.days[d]!, 0) + p.clash;
      return {
        userId: `00000000-0000-0000-0000-00000000000${i}`,
        name: p.name,
        club: p.club ? (kits.get(p.club) ?? null) : null,
        days: p.days,
        counted,
        clash: p.clash,
        points,
        seconds: 0,
        position: 0,
        mine: Boolean(p.mine),
        moved: p.moved || null,
      };
    })
    .sort((a, b) => b.points - a.points)
    .map((r, i) => ({ ...r, position: i + 1 }));
}

const LEAGUE: League = { id: 0, name: "Yaba Ballers", invite_code: "K7Q2XY", owner_id: "00000000-0000-0000-0000-000000000000" };

export async function previewLeague(kind: (typeof LEAGUE_PREVIEWS)[number]): Promise<LeagueView> {
  const now = currentWeek();
  const week = { ...now, today: addDays(now.startsOn, 5) };
  const rows = sampleRows(await clubs());
  if (kind === "invite") {
    const outside = rows.map((r) => (r.mine ? { ...r, name: "paul.c", mine: false } : r));
    return { kind: "invite", league: LEAGUE, week, rows: outside, captain: "tunde", full: false };
  }
  return { kind: "table", league: LEAGUE, week, rows, captain: "tunde", owner: false };
}

export async function previewHub(kind: (typeof HUB_PREVIEWS)[number]): Promise<Hub> {
  const kits = await clubs();
  const week = currentWeek();
  if (kind === "first") {
    return { week, leagues: [], everyone: { position: null, players: 2316, points: 0, moved: null }, club: null, fanbase: { position: null, clubs: 9 } };
  }
  const line = (league: League, rows: TableLine[]) => {
    const mine = rows.find((r) => r.mine)!;
    return { league, members: rows.length, position: mine.position, points: mine.points, moved: mine.moved, top: rows.slice(0, 3), gap: gapLine(rows) };
  };
  const yaba = sampleRows(kits);
  const okafors = sampleRows(kits, [PLAYERS[1], { ...PLAYERS[2], name: "dad" }, { ...PLAYERS[4], name: "chi" }, { ...PLAYERS[7], name: "ify" }]);
  const sunday = sampleRows(
    kits,
    PLAYERS.map((p) => (p.mine ? { ...p, days: [40, null, 35, null, null, null, null], clash: 18, moved: -2 } : p)),
  );
  return {
    week,
    leagues: [
      line(LEAGUE, yaba),
      line({ ...LEAGUE, id: 1, name: "Sunday League Legends", invite_code: "SUN123" }, sunday),
      line({ ...LEAGUE, id: 2, name: "The Okafors", invite_code: "OKA456" }, okafors),
    ],
    everyone: { position: 418, players: 2316, points: yaba.find((r) => r.mine)!.points, moved: 37 },
    club: kits.get("CHE") ?? null,
    fanbase: { position: 4, clubs: 9 },
  };
}
