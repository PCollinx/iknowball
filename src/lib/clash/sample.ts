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


