import "server-only";
import * as Sentry from "@sentry/nextjs";
import { draftEmptyDays, publishDueDrafts } from "@/lib/drafts/draft-job";
import { importDueClubs } from "@/lib/drafts/import-job";
import { syncFixtures } from "@/lib/fixtures/sync";
import { syncMatchData } from "@/lib/matchdata/sync";
import { createAdminClient } from "@/lib/supabase/admin";
import { addDays, gameDate } from "@/lib/time";
import {
  dailyProblems,
  draftProblems,
  fixtureProblems,
  importProblems,
  JOB_NAMES,
  matchDataProblems,
  staleRuns,
  type JobName,
  type RunRow,
} from "./problems";

// The control room (Collins, 30 Oct 2026): every scheduled job runs through
// runJob, which logs it in job_runs and tells Sentry about anything wrong, so
// a bad night arrives as an email instead of waiting to be noticed.

type Outcome = { summary: unknown; problems: string[] };

/** What each job does, with the problems in its result. */
const WORK: Record<JobName, () => Promise<Outcome>> = {
  fixtures: async () => {
    const summary = await syncFixtures();
    return { summary, problems: fixtureProblems(summary) };
  },
  "match-data": async () => {
    const summary = await syncMatchData();
    return { summary, problems: matchDataProblems(summary) };
  },
  "import-wikidata": async () => {
    const summary = await importDueClubs();
    const problems = importProblems(summary);
    if (summary.results.length && summary.failed === summary.results.length) throw new Error(`Every club failed. ${problems[0]}`);
    return { summary, problems };
  },
  drafts: async () => {
    const drafts = await draftEmptyDays();
    const published = await publishDueDrafts();
    const today = gameDate();
    const { data, error } = await createAdminClient()
      .from("dailies")
      .select("play_date, part, status")
      .gte("play_date", today)
      .lte("play_date", addDays(today, 1));
    if (error) throw error;
    return { summary: { ...drafts, published }, problems: [...draftProblems(drafts), ...dailyProblems(data ?? [], [today, addDays(today, 1)])] };
  },
};

export type JobRun = { job: JobName; status: "ok" | "warning" | "failed"; summary: unknown; problems: string[] };

/** Runs a job, logs the run and reports problems. Never throws: a failure comes back as status "failed". */
export async function runJob(job: JobName, trigger: "cron" | "manual" = "cron", work: () => Promise<Outcome> = WORK[job]): Promise<JobRun> {
  const admin = createAdminClient();
  const { data: row } = await admin.from("job_runs").insert({ job, trigger }).select("id").single();
  let run: JobRun;
  try {
    const { summary, problems } = await work();
    run = { job, status: problems.length ? "warning" : "ok", summary, problems };
    if (problems.length)
      Sentry.captureMessage(`${job}: ${problems[0]}`, { level: "warning", fingerprint: ["job", job, "problems"], tags: { job }, extra: { problems } });
  } catch (e) {
    const message = e instanceof Error ? e.message : typeof e === "object" && e && "message" in e ? String(e.message) : String(e);
    run = { job, status: "failed", summary: null, problems: [message] };
    Sentry.captureException(e, { fingerprint: ["job", job, "failed"], tags: { job } });
  }
  if (row)
    await admin
      .from("job_runs")
      .update({ status: run.status, finished_at: new Date().toISOString(), summary: run.summary, problems: run.problems })
      .eq("id", row.id);
  await checkJobs();
  await Sentry.flush(2000);
  return run;
}

/** Each job's latest run. */
export async function latestRuns(): Promise<RunRow[]> {
  const admin = createAdminClient();
  const rows = await Promise.all(
    JOB_NAMES.map((job) => admin.from("job_runs").select("id, job, status, started_at").eq("job", job).order("started_at", { ascending: false }).limit(1).maybeSingle()),
  );
  return rows.flatMap((r) => (r.data ? [r.data] : []));
}

/**
 * After every run: marks runs the platform cut off as failed and reports them,
 * and reports any job that hasn't run for a night. Each job checks the others,
 * so one that stops altogether is still noticed.
 */
export async function checkJobs(now = new Date()) {
  const admin = createAdminClient();
  for (const stale of staleRuns(await latestRuns(), now)) {
    if (stale.runId)
      await admin.from("job_runs").update({ status: "failed", finished_at: now.toISOString(), problems: [stale.message] }).eq("id", stale.runId);
    Sentry.captureMessage(`${stale.job}: ${stale.message}`, { level: "error", fingerprint: ["job", stale.job, stale.kind], tags: { job: stale.job } });
  }
  // Two months of runs is plenty to look back on.
  await admin.from("job_runs").delete().lt("started_at", new Date(now.getTime() - 60 * 86_400_000).toISOString());
}
