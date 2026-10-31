import { Suspense } from "react";
import { connection } from "next/server";
import { Chip, MAKER_MAIN, MakerBar, MakerHead, type ChipKind } from "@/components/maker/MakerBar";
import { RunNow } from "@/components/maker/RunNow";
import { getControlRoom, type Run } from "@/lib/control/data";
import { JOB_NAMES, JOBS, MISSED_AFTER_HOURS, type JobName } from "@/lib/control/problems";
import { dayLabel } from "@/lib/drafts/matchday";
import { requireAdmin } from "@/lib/maker/data";

// Run now waits for the job, and the longest take up to 300 s.
export const maxDuration = 300;

export default function JobsPage() {
  return (
    <Suspense fallback={<main className="min-h-dvh" aria-busy="true" />}>
      <ControlRoom />
    </Suspense>
  );
}

const WAT = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Lagos", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const ago = (iso: string, now: number) => {
  const minutes = Math.round((now - new Date(iso).getTime()) / 60_000);
  return minutes < 60 ? `${minutes} min ago` : minutes < 48 * 60 ? `${Math.round(minutes / 60)} h ago` : `${Math.round(minutes / 1440)} days ago`;
};
const seconds = (r: Run) => (r.finished_at ? Math.round((new Date(r.finished_at).getTime() - new Date(r.started_at).getTime()) / 1000) : null);

const CHIP: Record<Run["status"], ChipKind> = { ok: "ok", warning: "warning", failed: "failed", running: "running" };
/** A run's box in the form guide. */
const BOX: Record<Run["status"], string> = {
  ok: "border-navy bg-teal-light",
  warning: "border-red-card bg-white shadow-[inset_0_0_0_3px_#fdeef0]",
  failed: "border-red-card bg-red-card",
  running: "border-navy bg-navy",
};
const WORD: Record<Run["status"], string> = { ok: "OK", warning: "Problems", failed: "Failed", running: "Running" };

/** A run's result as short lines: numbers as they are, lists by their length. */
function summaryLines(summary: unknown): string[] {
  if (!summary || typeof summary !== "object") return [];
  return Object.entries(summary).flatMap(([k, v]) => {
    if (typeof v === "number" || typeof v === "string") return [`${k}: ${v}`];
    if (Array.isArray(v)) return [`${k}: ${v.length}`];
    return [];
  });
}

async function ControlRoom() {
  await connection();
  await requireAdmin();
  const room = await getControlRoom();
  const now = room.at;
  const done = room.season.finished - room.season.waiting;

  const lastStatus = JOB_NAMES.map((job) => room.runs.get(job)?.[0]?.status);
  const troubled = lastStatus.filter((s) => s === "warning" || s === "failed").length;
  const panel = "min-w-0 border-2 border-navy bg-mist p-3";

  return (
    <>
      <MakerBar active="jobs" />
      <main className={MAKER_MAIN}>
        <MakerHead title="Jobs" tools={<Chip kind={troubled ? "failed" : "ok"}>{troubled ? `${troubled} with problems` : `All ${JOB_NAMES.length} OK`}</Chip>}>
          What the scheduled jobs did. Times are WAT. A failed run, a run with problems, a run cut off at the time limit and a job silent for {MISSED_AFTER_HOURS} hours also go to Sentry, which emails you.
        </MakerHead>

        <section className="grid gap-3 sm:grid-cols-3">
          <div className={panel}>
            <p className="label">Highlightly, last 24 h</p>
            <p className="font-display text-[40px] leading-[0.9] tabular-nums">
              {room.calls.used}
              <span className="text-xl text-slate"> / {room.calls.budget}</span>
            </p>
            <div className="mt-1.5 h-2 bg-track">
              <div className={`h-2 ${room.calls.used >= room.calls.budget ? "bg-red-card" : "bg-royal"}`} style={{ width: `${Math.min(100, (room.calls.used / room.calls.budget) * 100)}%` }} />
            </div>
            <p className="mt-1.5 text-[13px] text-slate">Jobs stop at {room.calls.budget}; the plan allows 100. Dev and live share the key.</p>
          </div>
          <div className={panel}>
            <p className="label">Season match data</p>
            <p className="font-display text-[40px] leading-[0.9] tabular-nums">
              {done}
              <span className="text-xl text-slate"> / {room.season.finished}</span>
            </p>
            <div className="mt-1.5 h-2 bg-track">
              <div className="h-2 bg-royal" style={{ width: `${room.season.finished ? Math.round((done / room.season.finished) * 100) : 0}%` }} />
            </div>
            <p className="mt-1.5 text-[13px] text-slate">
              {room.season.waiting ? `Finished Premier League matches with their details. ${room.season.waiting} to fetch over the next nights.` : "Every finished match is in, so the season-wide templates are on."}
            </p>
          </div>
          <div className={panel}>
            <p className="label">The Daily</p>
            <ul className="mt-1 grid gap-1.5 text-[13px]">
              {room.days.map((d) => {
                const ready = d.parts.length > 0 && d.parts.every((p) => p.status === "scheduled");
                return (
                  <li key={d.date}>
                    <p className="flex items-baseline justify-between gap-2 font-semibold">
                      <span className="min-w-0 truncate">
                        {dayLabel(d.date)}
                        {d.parts[0] && ` · ${d.parts[0].title}`}
                      </span>
                      <Chip kind={ready ? "scheduled" : "failed"}>{ready ? "Scheduled" : d.parts.length ? "Not scheduled" : "None"}</Chip>
                    </p>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        <div className="mt-4 grid gap-3">
          {JOB_NAMES.map((job) => (
            <JobSection key={job} job={job} runs={room.runs.get(job) ?? []} now={now} />
          ))}
        </div>
        <p className="mt-2 text-[13px] text-slate">The form guide is the last 14 runs, oldest first: light teal OK, red outline problems, red failed, navy running.</p>
      </main>
    </>
  );
}

function JobSection({ job, runs, now }: { job: JobName; runs: Run[]; now: number }) {
  const meta = JOBS[job];
  const last = runs[0];
  return (
    <section className="grid gap-3 border-2 border-navy p-3 sm:grid-cols-[minmax(0,1fr)_220px] sm:gap-5">
      <div className="grid min-w-0 content-start gap-1.5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
          <h2 className="font-display text-2xl leading-none uppercase">{meta.label}</h2>
          <span className="text-xs text-slate">
            Nightly at {meta.at} · up to {meta.maxSeconds} s
          </span>
        </div>
        <p className="text-sm text-slate">{meta.does}</p>
        {last ? (
          <>
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
              <Chip kind={CHIP[last.status]}>{WORD[last.status]}</Chip>
              <span className="font-semibold">{WAT.format(new Date(last.started_at))}</span>
              <span className="text-slate">
                {ago(last.started_at, now)}
                {seconds(last) !== null && ` · ${seconds(last)} s`}
                {last.trigger === "manual" && " · run by hand"}
              </span>
            </p>
            {last.problems.length > 0 && (
              <ul className="grid gap-0.5 text-[13px] font-semibold text-red-card">
                {last.problems.slice(0, 6).map((p) => (
                  <li key={p}>{p}</li>
                ))}
                {last.problems.length > 6 && <li>and {last.problems.length - 6} more</li>}
              </ul>
            )}
            {summaryLines(last.summary).length > 0 && <p className="font-mono text-xs break-words text-slate">{summaryLines(last.summary).join(" · ")}</p>}
            <ol className="mt-1 flex flex-wrap gap-[3px]" aria-label="Recent runs, oldest first">
              {[...runs].reverse().map((r) => (
                <li key={r.id} title={`${WAT.format(new Date(r.started_at))} · ${WORD[r.status]}`} className={`size-4 border-[1.5px] ${BOX[r.status]}`}>
                  <span className="sr-only">
                    {WAT.format(new Date(r.started_at))}: {WORD[r.status]}
                  </span>
                </li>
              ))}
            </ol>
          </>
        ) : (
          <p className="text-[13px] text-slate">No runs logged yet.</p>
        )}
      </div>
      <aside className="content-start">
        <RunNow job={job} note={job === "match-data" ? "Spends up to 60 Highlightly calls, shared with live." : job === "fixtures" ? "About 12 Highlightly calls." : undefined} />
      </aside>
    </section>
  );
}
