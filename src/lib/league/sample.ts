import "server-only";
import type { Club } from "@/lib/profile/club";
import { CLUB_COLUMNS } from "@/lib/profile/data";
import { createAdminClient } from "@/lib/supabase/admin";
import { currentWeek, FANBASE_MIN, type FanbaseLine, type TableLine, type Week } from "./data";

// Test sites only: Everyone and the fanbase with sample data, so Collins can
// see each state before real players fill them. Nothing is written.
// /league/everyone?preview=xi|bench|below|idle (where you stand) and
// /league/fans?preview=in|gate|none (your club on the table, short of 25 fans, no club).
// Remove once tested.

export const EVERYONE_PREVIEWS = ["xi", "bench", "below", "idle"] as const;
export const FANS_PREVIEWS = ["in", "gate", "none"] as const;
export type EveryonePreview = (typeof EVERYONE_PREVIEWS)[number];
export type FansPreview = (typeof FANS_PREVIEWS)[number];
export const isEveryonePreview = (v: unknown): v is EveryonePreview => EVERYONE_PREVIEWS.includes(v as never);
export const isFansPreview = (v: unknown): v is FansPreview => FANS_PREVIEWS.includes(v as never);

const TOP: [string, string | null, number][] = [
  ["kemi_ld", "LIV", 268], ["osas", "MUN", 261], ["tobi.fc", "ARS", 255], ["big_sam", "CHE", 249], ["ngozi", "ARS", 244],
  ["jj_okoro", "MCI", 240], ["dele10", "TOT", 236], ["ifeoma", "NEW", 233], ["sule", "AVL", 229], ["Guest 7C1E", null, 226],
  ["kunle", "CHE", 224], ["ama", "ARS", 221], ["rotimi", "LIV", 218], ["bayo", "MUN", 215], ["chidi_x", "EVE", 212],
  ["zainab", "ARS", 209], ["femi.o", "TOT", 207], ["tola", "MCI", 204], ["akin", "CHE", 203], ["uche", "LIV", 201],
];

async function clubs(): Promise<Map<string, Club>> {
  const { data, error } = await createAdminClient().from("clubs").select(CLUB_COLUMNS);
  if (error) throw error;
  return new Map(((data ?? []) as Club[]).map((c) => [c.short_name, c]));
}

export async function previewEveryone(
  kind: EveryonePreview,
): Promise<{ week: Week; top: TableLine[]; mine: TableLine | null; myClub: Club | null; players: number }> {
  const kits = await clubs();
  const line = (name: string, club: string | null, points: number, position: number, mine = false): TableLine => ({
    userId: `sample-${position}`,
    name,
    club: club ? (kits.get(club) ?? null) : null,
    days: Array(7).fill(null),
    counted: [],
    clash: 0,
    points,
    seconds: 0,
    position,
    mine,
    moved: null,
  });
  const at = kind === "xi" ? 4 : kind === "bench" ? 15 : 0;
  const top = TOP.map(([name, club, points], i) => (i + 1 === at ? line("You", "CHE", points, i + 1, true) : line(name, club, points, i + 1)));
  return {
    week: currentWeek(),
    top,
    mine: kind === "below" ? line("You", "CHE", 96, 214, true) : null,
    myClub: kits.get("CHE") ?? null,
    players: 1284,
  };
}

const FANS: [string, number, number][] = [
  ["ARS", 141, 312], ["LIV", 138, 287], ["CHE", 131, 245], ["MUN", 127, 301], ["MCI", 119, 156], ["TOT", 112, 98],
  ["NEW", 108, 41], ["AVL", 99, 33], ["RMA", 97, 52], ["BAR", 92, 47], ["EVE", 88, 28],
];

export async function previewFans(
  kind: FansPreview,
): Promise<{ week: Week; rows: FanbaseLine[]; myClub: Club | null; myClubFans: number; minFans: number }> {
  const kits = await clubs();
  const mine = kind === "in" ? "CHE" : kind === "gate" ? "COV" : null;
  const rows = FANS.filter(([short]) => kits.has(short)).map(([short, average, fans], i) => {
    const club = kits.get(short)!;
    return { clubId: club.id, fans, average, position: i + 1, club, mine: short === mine };
  });
  return { week: currentWeek(), rows, myClub: mine ? (kits.get(mine) ?? null) : null, myClubFans: kind === "gate" ? 9 : 0, minFans: FANBASE_MIN };
}
