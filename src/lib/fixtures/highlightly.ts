import "server-only";
import { serverEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import type { HighlightlyMatch } from "./parse";

// The only place that calls Highlightly. Every call is logged in api_calls so
// jobs can stay inside the free plan's 100 a day.

/** Calls a day the jobs may use; the rest of the 100 is left for running jobs by hand. */
export const DAILY_BUDGET = 80;

export async function callsToday(): Promise<number> {
  const since = new Date(Date.now() - 86_400_000).toISOString();
  const { count, error } = await createAdminClient()
    .from("api_calls")
    .select("id", { count: "exact", head: true })
    .eq("source", "highlightly")
    .gte("called_at", since);
  if (error) throw error;
  return count ?? 0;
}

async function get<T>(path: string, params: Record<string, string | number>): Promise<T> {
  const env = serverEnv();
  const url = new URL(path, env.HIGHLIGHTLY_BASE_URL);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  const res = await fetch(url, { headers: { "x-rapidapi-key": env.HIGHLIGHTLY_API_KEY }, cache: "no-store" });
  await createAdminClient()
    .from("api_calls")
    .insert({ source: "highlightly", endpoint: `${path}?${url.searchParams}`, status_code: res.status });
  if (!res.ok) throw new Error(`Highlightly ${path} answered ${res.status}`);
  return (await res.json()) as T;
}

type Page<T> = { data: T[]; pagination: { totalCount: number; offset: number; limit: number } };

/** Highlightly's league id for the UEFA Champions League (found 29 Oct 2026 through /leagues). */
export const UCL_LEAGUE_ID = 2486;

/** Every match of the season in a league (the Premier League unless told), newest first, 100 a call. */
export async function seasonMatches(leagueId?: number): Promise<HighlightlyMatch[]> {
  const env = serverEnv();
  const matches: HighlightlyMatch[] = [];
  for (let offset = 0; ; offset += 100) {
    const page = await get<Page<HighlightlyMatch>>("/matches", {
      leagueId: leagueId ?? env.HIGHLIGHTLY_PL_LEAGUE_ID,
      season: env.HIGHLIGHTLY_SEASON,
      limit: 100,
      offset,
    });
    matches.push(...page.data);
    if (!page.data.length || offset + 100 >= page.pagination.totalCount) return matches;
  }
}
