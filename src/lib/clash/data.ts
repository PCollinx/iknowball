import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { currentUserId, guestName } from "@/lib/daily/data";
import { isTestSite } from "@/lib/daily/sample";
import { buildChain, newCode, SET_SIZE, STATS, type Item, type Stat } from "./rules";
import { samplePool } from "./sample";
import { addDays, gameDate, gameDateClosesAt, matchweekBounds } from "@/lib/time";

// Data access for Clash. Reads and writes with the service role: the sets
// hold every answer, so the browser only ever gets what's on screen.

/** Answers that land just after the buzzer still count, as in the Daily. */
export const GRACE_MS = 1500;

export type SetRow = { id: number; code: string; stat: Stat; items: Item[]; created_by: string | null };
export type RunRow = {
  id: number;
  set_id: number;
  user_id: string;
  started_at: string;
  /** When the clock started: the sprint on screen. Null between Kick off and then. */
  begun_at: string | null;
  deadline_at: string;
  submitted_at: string | null;
  answered: number;
  right_count: number;
  best_run: number;
  current_run: number;
  kicks: string;
};

export function isRunOpen(run: RunRow, now = Date.now()): boolean {
  return !run.submitted_at && now <= Date.parse(run.deadline_at) + GRACE_MS;
}

/** A run is over once every player in the set has been answered. */
export const isLastAnswer = (run: { answered: number }, set: SetRow) => run.answered + 1 >= set.items.length;

export async function getSet(code: string): Promise<SetRow | null> {
  const { data, error } = await createAdminClient().from("clash_sets").select("id, code, stat, items, created_by").eq("code", code).maybeSingle();
  if (error) throw error;
  return data as SetRow | null;
}

// A set never changes once made, so each server keeps the ones in play: an
// answer then costs one database call, not two.
const setCache = new Map<string, SetRow>();

export async function cachedSet(code: string): Promise<SetRow | null> {
  const hit = setCache.get(code);
  if (hit) return hit;
  const set = await getSet(code);
  if (set) {
    if (setCache.size > 200) setCache.clear();
    setCache.set(code, set);
  }
  return set;
}

export async function getRun(setId: number, userId: string): Promise<RunRow | null> {
  const { data, error } = await createAdminClient().from("clash_runs").select("*").eq("set_id", setId).eq("user_id", userId).maybeSingle();
  if (error) throw error;
  return data as RunRow | null;
}

/** Closes a run whose clock ran out, at its deadline. */
export async function settle(run: RunRow): Promise<RunRow> {
  if (run.submitted_at || isRunOpen(run)) return run;
  const submitted_at = run.deadline_at;
  await createAdminClient().from("clash_runs").update({ submitted_at }).eq("id", run.id).is("submitted_at", null);
  return { ...run, submitted_at };
}

async function drawPool(stat: Exclude<Stat, "sample">): Promise<Item[]> {
  const { data, error } = await createAdminClient().rpc("clash_pool", { p_stat: stat, p_min: STATS[stat].min, p_limit: SET_SIZE * 3 });
  if (error) throw error;
  return ((data ?? []) as { player_name: string; club_id: number; value: number }[]).map((r) => ({ name: r.player_name, club_id: r.club_id, value: r.value }));
}

/** A fresh set for a solo sprint: a stat with enough players, its chain and a code. */
export async function createSet(userId: string): Promise<SetRow> {
  const admin = createAdminClient();
  const order: Exclude<Stat, "sample">[] = Math.random() < 0.5 ? ["goals", "apps"] : ["apps", "goals"];
  let stat: Stat | null = null;
  let items: Item[] = [];
  for (const s of order) {
    const chain = buildChain(await drawPool(s));
    if (chain.length >= SET_SIZE) {
      stat = s;
      items = chain;
      break;
    }
  }
  if (!stat && isTestSite()) {
    const { data } = await admin.from("clubs").select("id, short_name");
    stat = "sample";
    items = buildChain(samplePool(new Map((data ?? []).map((c) => [c.short_name, c.id]))));
  }
  if (!stat) throw new Error("Clash isn't ready yet: not enough players with numbers. Try again later.");

  // A clash of codes is rare; try a few before giving up.
  for (let i = 0; i < 5; i++) {
    const { data, error } = await admin
      .from("clash_sets")
      .insert({ code: newCode(), stat, items, created_by: userId })
      .select("id, code, stat, items, created_by")
      .single();
    if (!error) return data as SetRow;
    if (error.code !== "23505") throw error;
  }
  throw new Error("Couldn't start a sprint. Try again.");
}

/** What the browser may see of a player before answering: never the number. */
export type Card = { name: string; clubId: number | null };
export const cardOf = (item: Item): Card => ({ name: item.name, clubId: item.club_id });

export type Result = {
  name: string;
  right: number;
  bestRun: number;
  kicks: string;
  mine: boolean;
  /** Whoever started the set: the score a challenge link dares you to beat. */
  setter: boolean;
};

export type ClashView =
  | { kind: "missing" }
  | { kind: "kickoff"; set: SetRow; setter: Result | null }
  | {
      kind: "play";
      set: SetRow;
      run: RunRow;
      /** The player on show, number included, and the one to call. */
      shown: Item;
      next: Card;
      serverNow: number;
    }
  | { kind: "fulltime"; set: SetRow; run: RunRow; table: Result[] };

/** Everyone's finished go at a set, best first: the challenge table. */
async function setTable(set: SetRow, me: string | null): Promise<Result[]> {
  const { data, error } = await createAdminClient()
    .from("clash_runs")
    .select("user_id, right_count, best_run, kicks, started_at, submitted_at, deadline_at, profiles(username)")
    .eq("set_id", set.id)
    .order("right_count", { ascending: false })
    .order("started_at")
    .limit(50);
  if (error) throw error;
  return ((data ?? []) as unknown as (RunRow & { profiles: { username: string | null } | null })[])
    .filter((r) => r.submitted_at || Date.parse(r.deadline_at) + GRACE_MS < Date.now())
    .map((r) => ({
      name: r.profiles?.username ?? guestName(r.user_id),
      right: r.right_count,
      bestRun: r.best_run,
      kicks: r.kicks,
      mine: r.user_id === me,
      setter: r.user_id === set.created_by,
    }));
}

export async function getClashView(code: string): Promise<ClashView> {
  const [set, userId] = await Promise.all([cachedSet(code), currentUserId()]);
  if (!set) return { kind: "missing" };
  const found = userId ? await getRun(set.id, userId) : null;

  if (!found) {
    const table = await setTable(set, userId);
    const setter = table.find((r) => r.setter) ?? null;
    return { kind: "kickoff", set, setter };
  }

  const run = await settle(found);
  if (isRunOpen(run) && run.answered + 1 < set.items.length) {
    return { kind: "play", set, run, shown: set.items[run.answered], next: cardOf(set.items[run.answered + 1]), serverNow: Date.now() };
  }
  const table = await setTable(set, userId);
  return { kind: "fulltime", set, run, table };
}

/** Whether a finished run is the player's best sprint of its matchweek (a tie counts). */
export async function isWeekBest(run: RunRow): Promise<boolean> {
  if (run.right_count === 0) return false;
  const { startsOn, endsOn } = matchweekBounds(gameDate(new Date(run.started_at)));
  const { data, error } = await createAdminClient()
    .from("clash_runs")
    .select("right_count")
    .eq("user_id", run.user_id)
    .gte("started_at", gameDateClosesAt(addDays(startsOn, -1)).toISOString())
    .lt("started_at", gameDateClosesAt(endsOn).toISOString())
    .gt("right_count", run.right_count)
    .limit(1);
  if (error) throw error;
  return !data?.length;
}

/** Clash on the home page: your best sprint this matchweek and your latest challenge code. */
export type HomeClash = { best: number | null; lastCode: string | null };

export async function getHomeClash(userId: string): Promise<HomeClash> {
  const admin = createAdminClient();
  const { startsOn, endsOn } = matchweekBounds(gameDate());
  const [runs, sets] = await Promise.all([
    admin
      .from("clash_runs")
      .select("right_count")
      .eq("user_id", userId)
      .gte("started_at", gameDateClosesAt(addDays(startsOn, -1)).toISOString())
      .lt("started_at", gameDateClosesAt(endsOn).toISOString())
      .order("right_count", { ascending: false })
      .limit(1),
    admin.from("clash_sets").select("code").eq("created_by", userId).order("created_at", { ascending: false }).limit(1),
  ]);
  if (runs.error) throw runs.error;
  if (sets.error) throw sets.error;
  return { best: runs.data?.[0]?.right_count ?? null, lastCode: sets.data?.[0]?.code ?? null };
}
