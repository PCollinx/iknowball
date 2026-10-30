import "server-only";
import type { ImportJobResult } from "@/lib/control/problems";
import { createAdminClient } from "@/lib/supabase/admin";
import { TRACKED_CLUBS, type TrackedClub } from "./clubs";
import { clubEndpoint, importClub, type ImportResult } from "./importer";

// A club imported within this window is skipped, so each run picks up where
// the last one stopped and a week's refresh spreads over several runs.
const FRESH_DAYS = 6;
// One club can take about a minute (Wikidata plus our upserts), so stop starting
// new ones well before the 300 s platform limit.
const TIME_BUDGET_MS = 170_000;

/** Refreshes the tracked clubs not imported this week, as many as fit in one run; or just `only`, fresh or not. */
export async function importDueClubs(only?: TrackedClub): Promise<ImportJobResult & { note: string }> {
  let clubs = only ? [only] : TRACKED_CLUBS;
  if (!only) {
    const since = new Date(Date.now() - FRESH_DAYS * 86_400_000).toISOString();
    const { data, error } = await createAdminClient()
      .from("api_calls")
      .select("endpoint")
      .eq("source", "wikidata")
      .eq("status_code", 200)
      .gte("called_at", since);
    if (error) throw error;
    const fresh = new Set((data ?? []).map((r) => r.endpoint));
    clubs = clubs.filter((c) => !fresh.has(clubEndpoint(c)));
  }

  const started = Date.now();
  const results: ImportResult[] = [];
  const left: string[] = [];
  for (const club of clubs) {
    // Leave room to answer before the platform cuts the request off.
    if (Date.now() - started > TIME_BUDGET_MS) {
      left.push(club.name);
      continue;
    }
    try {
      results.push(await importClub(club));
    } catch (e) {
      results.push({ club: club.name, error: e instanceof Error ? e.message : String(e) });
    }
  }
  const failed = results.filter((r) => "error" in r).length;
  return { results, failed, left, note: left.length ? "Out of time. Run again to carry on." : "All tracked clubs are up to date." };
}
