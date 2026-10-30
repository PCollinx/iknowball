import "server-only";
import { callsToday, DAILY_BUDGET } from "@/lib/fixtures/highlightly";
import { serverEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { addDays, gameDate } from "@/lib/time";
import { JOB_NAMES, type JobName } from "./problems";

export type Run = {
  id: number;
  trigger: string;
  started_at: string;
  finished_at: string | null;
  status: "running" | "ok" | "warning" | "failed";
  summary: unknown;
  problems: string[];
};
export type DayStatus = { date: string; parts: { part: number; status: string; title: string; template: string | null }[] };

/** Runs shown a job. */
const RECENT = 14;

/** Everything the control room shows: each job's recent runs, Highlightly calls, the next two Dailies and how far the season's match data has got. */
export async function getControlRoom() {
  const admin = createAdminClient();
  const today = gameDate();
  const [runs, calls, dailies, finished, waiting] = await Promise.all([
    Promise.all(
      JOB_NAMES.map(async (job) => {
        const { data, error } = await admin
          .from("job_runs")
          .select("id, trigger, started_at, finished_at, status, summary, problems")
          .eq("job", job)
          .order("started_at", { ascending: false })
          .limit(RECENT);
        if (error) throw error;
        return [job, (data ?? []) as Run[]] as const;
      }),
    ),
    callsToday(),
    admin.from("dailies").select("play_date, part, status, title, template").gte("play_date", today).lte("play_date", addDays(today, 1)).order("part"),
    seasonFixtures(false),
    seasonFixtures(true),
  ]);
  if (dailies.error) throw dailies.error;
  const days: DayStatus[] = [today, addDays(today, 1)].map((date) => ({
    date,
    parts: (dailies.data ?? []).filter((d) => d.play_date === date).map((d) => ({ part: d.part, status: d.status, title: d.title, template: d.template })),
  }));
  return {
    /** When this was read, for "2 h ago". */
    at: Date.now(),
    runs: new Map<JobName, Run[]>(runs),
    calls: { used: calls, budget: DAILY_BUDGET },
    days,
    season: { finished, waiting },
  };
}

/** This season's finished Premier League matches, or only those still without their details. */
async function seasonFixtures(waiting: boolean): Promise<number> {
  let q = createAdminClient()
    .from("fixtures")
    .select("id", { head: true, count: "exact" })
    .eq("competition", "PL")
    .eq("season", serverEnv().HIGHLIGHTLY_SEASON)
    .eq("status", "finished")
    .not("highlightly_match_id", "is", null);
  if (waiting) q = q.is("details_synced_at", null);
  const { count, error } = await q;
  if (error) throw error;
  return count ?? 0;
}
