import type { ClashView, Result } from "./data";
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

/** Full time's states, for a look on test sites with ?preview= (Collins tests
 * them before they go; nothing is written to the shared dev database). */
export const PREVIEWS = ["solo", "challenge", "level", "lost"] as const;
export type Preview = (typeof PREVIEWS)[number];
export const isPreview = (v: unknown): v is Preview => PREVIEWS.includes(v as Preview);

const YOURS: Record<Preview, string> = {
  solo: "1111011101111101101101",
  challenge: "111101111011110110110",
  level: "1110111101110111010",
  lost: "1101101110101101",
};
const SETTER = { name: "tunde", kicks: "111011110111011101" };

const runOf = (kicks: string) => Math.max(0, ...kicks.split("0").map((r) => r.length));
const rightOf = (kicks: string) => [...kicks].filter((k) => k === "1").length;

export function previewView(kind: Preview, code: string): Extract<ClashView, { kind: "fulltime" }> {
  const me = "00000000-0000-0000-0000-000000000001";
  const kicks = YOURS[kind];
  const now = new Date().toISOString();
  const you: Result = { name: "You", right: rightOf(kicks), bestRun: runOf(kicks), kicks, mine: true, setter: kind === "solo" };
  const table: Result[] =
    kind === "solo"
      ? [you]
      : [
          you,
          { name: SETTER.name, right: rightOf(SETTER.kicks), bestRun: runOf(SETTER.kicks), kicks: SETTER.kicks, mine: false, setter: true },
          { name: "Guest 4F2A", right: 11, bestRun: 4, kicks: "11011101110101", mine: false, setter: false },
          { name: "chioma", right: 9, bestRun: 3, kicks: "1101110110101", mine: false, setter: false },
        ].sort((a, b) => b.right - a.right);
  return {
    kind: "fulltime",
    set: { id: 0, code, stat: "goals", items: Array.from({ length: 40 }, () => ({ name: "", club_id: null, value: 0 })), created_by: kind === "solo" ? me : null },
    run: { id: 0, set_id: 0, user_id: me, started_at: now, deadline_at: now, submitted_at: now, answered: kicks.length, right_count: you.right, best_run: you.bestRun, current_run: 0, kicks },
    table,
  };
}
