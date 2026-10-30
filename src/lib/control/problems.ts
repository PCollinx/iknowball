import type { DraftResult } from "@/lib/drafts/draft-job";
import type { ImportResult } from "@/lib/drafts/importer";
import type { SyncResult } from "@/lib/fixtures/sync";
import type { MatchDataResult } from "@/lib/matchdata/sync";
import { dayLabel } from "@/lib/drafts/matchday";

// The control room (Collins, 30 Oct 2026): what counts as a problem in each
// scheduled job's result, and in the runs themselves. Pure, so it's tested.

export const JOB_NAMES = ["fixtures", "match-data", "import-wikidata", "drafts"] as const;
export type JobName = (typeof JOB_NAMES)[number];

/** Times are WAT, as vercel.json has them in UTC. On Vercel Hobby a job runs any time within its hour. */
export const JOBS: Record<JobName, { label: string; at: string; does: string; maxSeconds: number }> = {
  fixtures: { label: "Fixture sync", at: "00:30", does: "Premier League, Champions League and cup fixtures and results from Highlightly.", maxSeconds: 60 },
  "match-data": { label: "Match data", at: "01:00", does: "The table, the coming pairs' last meetings, and finished matches' goals, cards and box scores.", maxSeconds: 300 },
  "import-wikidata": { label: "Wikidata import", at: "04:00", does: "A few clubs' player histories, managers and grounds; each club weekly.", maxSeconds: 300 },
  drafts: { label: "Drafts", at: "20:00", does: "Drafts empty days 8 ahead and schedules the drafts due today and tomorrow.", maxSeconds: 120 },
};

/** A job whose last run started longer ago than this has missed a night (a day plus the hour Hobby may run it in, and some). */
export const MISSED_AFTER_HOURS = 26;

export type ImportJobResult = { results: ImportResult[]; failed: number; left: string[] };

export function fixtureProblems(r: SyncResult | { skipped: string }): string[] {
  if ("skipped" in r) return [`Skipped: ${r.skipped}`];
  return r.unknownTeams.length ? [`Teams we have no club for, their matches skipped: ${r.unknownTeams.join(", ")}.`] : [];
}

export function matchDataProblems(r: MatchDataResult): string[] {
  // Out of calls is normal while the season is being filled in; out of calls before a single match isn't.
  return r.left > 0 && r.matches === 0 ? [`No matches filled in: ${r.note ?? "out of calls"}`] : [];
}

export function importProblems(r: ImportJobResult): string[] {
  return r.results.flatMap((c) => ("error" in c ? [`${c.club}: ${c.error}`] : []));
}

export function draftProblems(r: DraftResult): string[] {
  return r.skipped.map((s) => `${dayLabel(s.date)} not drafted: ${s.reason}`);
}

/** Today's and tomorrow's Dailies: both parts scheduled, else a problem. Checked after the drafts job schedules them. */
export function dailyProblems(rows: { play_date: string; part: number; status: string }[], dates: string[]): string[] {
  return dates.flatMap((date) => {
    const parts = rows.filter((r) => r.play_date === date);
    if (!parts.length) return [`No Daily for ${dayLabel(date)}.`];
    const waiting = [1, 2].filter((p) => parts.find((r) => r.part === p)?.status !== "scheduled");
    return waiting.length ? [`${dayLabel(date)}: Part ${waiting.join(" and ")} not scheduled.`] : [];
  });
}

export type RunRow = { id: number; job: string; status: string; started_at: string };
export type StaleRun = { job: JobName; kind: "timed-out" | "missed"; runId?: number; message: string };

/**
 * Runs that never finished (the platform cut them off) and jobs that haven't
 * run for a night, from each job's latest run. A job that has never run is
 * left alone: it hasn't been deployed yet.
 */
export function staleRuns(latest: RunRow[], now: Date): StaleRun[] {
  return JOB_NAMES.flatMap((job): StaleRun[] => {
    const run = latest.find((r) => r.job === job);
    if (!run) return [];
    const age = (now.getTime() - new Date(run.started_at).getTime()) / 1000;
    if (run.status === "running" && age > JOBS[job].maxSeconds + 60)
      return [{ job, kind: "timed-out", runId: run.id, message: `Didn't finish within ${JOBS[job].maxSeconds} s: the platform cut it off.` }];
    if (age > MISSED_AFTER_HOURS * 3600) return [{ job, kind: "missed", message: `Hasn't run for ${Math.floor(age / 3600)} hours.` }];
    return [];
  });
}
