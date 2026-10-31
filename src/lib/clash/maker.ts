import "server-only";
import { guestName } from "@/lib/daily/data";
import { COUNTED_SPRINTS } from "@/lib/league/week";
import { createAdminClient } from "@/lib/supabase/admin";
import { addDays, gameDate, gameDateClosesAt, matchweekBounds } from "@/lib/time";
import { buildChain, SET_SIZE, STATS, type Item, type LiveStat } from "./rules";

// The maker's Clash page (Collins, 31 Oct 2026, mocks at
// https://claude.ai/artifact/7fYaL9vEK1xQvVEHgEUFW6): who a sprint can draw for
// each stat, with the numbers struck out; recent sets; this week's sprints.
// Every caller has passed requireAdmin.

/** How many players a sprint draws from (clash_pool's limit). */
export const POOL_SIZE = 250;

export type PoolRow = { playerId: number; name: string; clubId: number; club: string; value: number; sitelinks: number | null; struck: boolean };

type Candidate = { player_id: number; player_name: string; club_id: number; value: number; sitelinks: number | null; struck: boolean };

/** The best-known players for a stat at top clubs, as the draw picks them, then the struck ones. */
export async function poolOf(stat: LiveStat): Promise<PoolRow[]> {
  const admin = createAdminClient();
  const args = { p_stat: stat, p_min: STATS[stat].min, p_top: true };
  const [live, struck, clubs] = await Promise.all([
    admin.rpc("clash_candidates", args).eq("struck", false).order("sitelinks", { ascending: false, nullsFirst: false }).limit(POOL_SIZE),
    admin.rpc("clash_candidates", args).eq("struck", true).limit(200),
    admin.from("clubs").select("id, name"),
  ]);
  if (live.error) throw live.error;
  if (struck.error) throw struck.error;
  if (clubs.error) throw clubs.error;
  const names = new Map((clubs.data ?? []).map((c) => [c.id as number, c.name as string]));
  return [...((live.data ?? []) as Candidate[]), ...((struck.data ?? []) as Candidate[])].map((r) => ({
    playerId: r.player_id,
    name: r.player_name,
    clubId: r.club_id,
    club: names.get(r.club_id) ?? "",
    value: r.value,
    sitelinks: r.sitelinks,
    struck: r.struck,
  }));
}

/** A set as a player would get it now, not saved: what a test draw shows. */
export async function testDraw(stat: LiveStat): Promise<Item[]> {
  const { data, error } = await createAdminClient().rpc("clash_pool", { p_stat: stat, p_min: STATS[stat].min, p_limit: SET_SIZE * 3, p_top: true });
  if (error) throw error;
  const pool = ((data ?? []) as { player_name: string; club_id: number; value: number }[]).map((r) => ({ name: r.player_name, club_id: r.club_id, value: r.value }));
  return buildChain(pool, SET_SIZE, Math.random, STATS[stat].gap);
}

export type RecentSet = { code: string; stat: string; by: string; rematch: boolean; played: number; best: number | null; at: string };

/** The latest sets, with how many finished them and the best score. */
export async function recentSets(limit = 12): Promise<RecentSet[]> {
  const admin = createAdminClient();
  const { data: sets, error } = await admin
    .from("clash_sets")
    .select("id, code, stat, created_by, rival_id, created_at, profiles!clash_sets_created_by_fkey(username)")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  if (!sets?.length) return [];
  const { data: runs, error: runsError } = await admin.from("clash_runs").select("set_id, right_count").in("set_id", sets.map((s) => s.id));
  if (runsError) throw runsError;
  return (sets as unknown as { id: number; code: string; stat: string; created_by: string | null; rival_id: string | null; created_at: string; profiles: { username: string | null } | null }[]).map((s) => {
    const mine = (runs ?? []).filter((r) => r.set_id === s.id).map((r) => r.right_count);
    return {
      code: s.code,
      stat: s.stat,
      by: s.profiles?.username ?? (s.created_by ? guestName(s.created_by) : "Gone"),
      rematch: s.rival_id !== null,
      played: mine.length,
      best: mine.length ? Math.max(...mine) : null,
      at: s.created_at,
    };
  });
}

/** This matchweek's sprints: how many, by how many players, their average, and how many players filled all three. */
export async function weekNumbers(): Promise<{ sprints: number; players: number; average: number; full: number }> {
  const { startsOn, endsOn } = matchweekBounds(gameDate());
  const { data, error } = await createAdminClient()
    .from("clash_runs")
    .select("user_id, right_count")
    .gte("started_at", gameDateClosesAt(addDays(startsOn, -1)).toISOString())
    .lt("started_at", gameDateClosesAt(endsOn).toISOString())
    .limit(5000);
  if (error) throw error;
  const rows = data ?? [];
  const per = new Map<string, number>();
  for (const r of rows) per.set(r.user_id, (per.get(r.user_id) ?? 0) + 1);
  return {
    sprints: rows.length,
    players: per.size,
    average: rows.length ? Math.round(rows.reduce((s, r) => s + r.right_count, 0) / rows.length) : 0,
    full: [...per.values()].filter((n) => n >= COUNTED_SPRINTS).length,
  };
}
