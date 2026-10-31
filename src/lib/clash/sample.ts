import { isTestSite } from "@/lib/daily/sample";
import type { Challenge } from "./challenges";
import type { Item } from "./rules";

// Test sites only: the dev database has no player data (the Wikidata import
// runs on production), so a sprint there plays this pack instead. Clubs are
// looked up by short name. Production never uses it.
export const SAMPLE: [string, string, number][] = [
  ["Alan Shearer", "NEW", 260],
  ["Harry Kane", "TOT", 213],
  ["Wayne Rooney", "MUN", 208],
  ["Andy Cole", "MUN", 187],
  ["Sergio Agüero", "MCI", 184],
  ["Frank Lampard", "CHE", 177],
  ["Thierry Henry", "ARS", 175],
  ["Robbie Fowler", "LIV", 163],
  ["Jermain Defoe", "TOT", 162],
  ["Michael Owen", "LIV", 150],
  ["Les Ferdinand", "NEW", 149],
  ["Teddy Sheringham", "TOT", 146],
  ["Robin van Persie", "ARS", 144],
  ["Dwight Yorke", "AVL", 123],
  ["Didier Drogba", "CHE", 104],
];

export function samplePool(clubIds: Map<string, number>): Item[] {
  return SAMPLE.map(([name, club, value]) => ({ name, club_id: clubIds.get(club) ?? null, value }));
}


// Test sites only (Collins, 31 Oct 2026): sample screens to check without
// mates or a Monday. "?sample=challenges" on home and /clash shows a beaten
// challenge's banner and the list with every state; "?sample=monday" on home
// shows the Monday reset. Nothing is written to the database; the codes don't
// exist, so "See the table" finds no challenge and Settle it plays a normal
// sprint. Production ignores it.
export type ClashSample = "challenges" | "monday";

export function clashSample(param: string | string[] | undefined): ClashSample | null {
  if (!isTestSite()) return null;
  return param === "challenges" || param === "monday" ? param : null;
}

export const SAMPLE_CHALLENGES: Challenge[] = [
  { code: "SMPL2B", stat: "goals", played: 4, mine: 14, rival: { userId: "sample-tunde", name: "tunde", right: 17 }, state: "beaten", news: true },
  { code: "SMPL3T", stat: "height", played: 2, mine: 19, rival: { userId: "sample-ada", name: "ada", right: 11 }, state: "top", news: false },
  { code: "SMPL4W", stat: "apps", played: 1, mine: 8, rival: null, state: "waiting", news: false },
];

/** Monday before your first sprint: nothing yet this week, last week's three. */
export const SAMPLE_MONDAY = { three: [] as number[], lastWeek: [18, 14, 9] };
