import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CuratedLists, ListKind } from "./lists";

/** Every list kept by hand, in a steady order (none is near Supabase's 1000 rows). */
export async function getLists(): Promise<CuratedLists> {
  const admin = createAdminClient();
  const [standings, goldenBoots, captains, results, moments] = await Promise.all([
    admin.from("season_standings").select("season, position, club, points").order("season").order("position"),
    admin.from("golden_boots").select("season, player, club, goals").order("season").order("player"),
    admin.from("club_captains").select("club, player, from_year, to_year").order("club").order("from_year").order("id"),
    admin.from("famous_results").select("played_on, home, home_goals, away_goals, away").order("played_on"),
    admin.from("player_moments").select("player, moment, club, happened_on, born_on").order("happened_on"),
  ]);
  for (const r of [standings, goldenBoots, captains, results, moments]) if (r.error) throw r.error;
  return {
    standings: standings.data ?? [],
    goldenBoots: goldenBoots.data ?? [],
    captains: captains.data ?? [],
    results: results.data ?? [],
    moments: (moments.data ?? []) as CuratedLists["moments"],
  };
}

/** Which of CuratedLists each list kind is. */
export const LIST_KEY: Record<ListKind, keyof CuratedLists> = {
  standings: "standings",
  "golden-boots": "goldenBoots",
  captains: "captains",
  results: "results",
  moments: "moments",
};
