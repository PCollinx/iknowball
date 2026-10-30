import { Suspense } from "react";
import { connection } from "next/server";
import { MakerBar } from "@/components/maker/MakerBar";
import { RunNow } from "@/components/maker/RunNow";
import { getControlRoom, type Run } from "@/lib/control/data";
import { JOB_NAMES, JOBS, MISSED_AFTER_HOURS, type JobName } from "@/lib/control/problems";
import { dayLabel } from "@/lib/drafts/matchday";
import { requireAdmin } from "@/lib/maker/data";

// Run now waits for the job, and the longest take up to 300 s.
export const maxDuration = 300;

export default function JobsPage() {
  return (
    <Suspense fallback={<main className="mx-auto min-h-dvh max-w-[1000px] px-4" aria-busy="true" />}>
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

const STAMP: Record<Run["status"], string> = {
  ok: "bg-teal-light text-navy",
  warning: "border-2 border-red-card text-red-card",
  failed: "bg-red-card text-white",
  running: "bg-navy text-sky",
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

  return (
    <main className="mx-auto min-h-dvh max-w-[1000px] px-4 pb-12 lg:px-8">
      <MakerBar active="jobs" />
      <div className="border-b-[3px] border-double border-navy py-4">
        <h1 className="font-display text-[56px] leading-[0.9] uppercase lg:text-[88px]">
          The <span className="text-royal">control room</span>
        </h1>
        <p className="mt-2 max-w-[640px] text-lg">
          What the scheduled jobs did. Times are WAT. A failed run, a run with problems, a run cut off at the time limit and a job that hasn&apos;t run for {MISSED_AFTER_HOURS} hours each go to Sentry too, which emails you.
        </p>
      </div>

      <section className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="bg-mist p-4">
          <p className="label">Highlightly, last 24 h</p>
          <p className="font-display text-[44px] leading-none">
            {room.calls.used}
            <span className="text-2xl text-navy/50"> / {room.calls.budget}</span>
          </p>
          <div className="mt-2 h-2 bg-track">
            <div className={`h-2 ${room.calls.used >= room.calls.budget ? "bg-red-card" : "bg-royal"}`} style={{ width: `${Math.min(100, (room.calls.used / room.calls.budget) * 100)}%` }} />
          </div>
          <p className="mt-2 text-[14px] text-navy/60">Jobs stop at {room.calls.budget}; the plan allows 100. Dev and live share the key.</p>
        </div>
        <div className="bg-mist p-4">
          <p className="label">Season match data</p>
          <p className="font-display text-[44px] leading-none">
            {done}
            <span className="text-2xl text-navy/50"> / {room.season.finished}</span>
          </p>
          <p className="mt-2 text-[14px] text-navy/60">
            {room.season.waiting ? `Finished Premier League matches with their details. Starters, scorers, Super Eagles and season goals wait for all of them.` : "Every finished match is in, so the season-wide templates are on."}
          </p>
        </div>
        <div className="bg-mist p-4">
          <p className="label">The Daily</p>
          <ul className="mt-1 grid gap-2">
            {room.days.map((d) => {
              const ready = d.parts.length === 2 && d.parts.every((p) => p.status === "scheduled");
              return (
                <li key={d.date}>
                  <p className="flex items-baseline justify-between gap-2 font-semibold">
                    {dayLabel(d.date)}
                    <span className={`label px-1.5 ${ready ? "bg-teal-light" : "bg-red-card text-white"}`}>{ready ? "Scheduled" : d.parts.length ? "Not scheduled" : "None"}</span>
                  </p>
                  {d.parts.map((p) => (
                    <p key={p.part} className="truncate text-[14px] text-navy/70">
                      {p.part}. {p.title} {p.status === "draft" && <span className="text-red-card">(draft)</span>}
                    </p>
                  ))}
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <div className="mt-8 grid gap-8">
        {JOB_NAMES.map((job) => (
          <JobSection key={job} job={job} runs={room.runs.get(job) ?? []} now={now} />
        ))}
      </div>
    </main>
  );
}

function JobSection({ job, runs, now }: { job: JobName; runs: Run[]; now: number }) {
  const meta = JOBS[job];
  const last = runs[0];
  return (
    <section className="grid gap-4 border-t-[3px] border-double border-navy pt-4 lg:grid-cols-[minmax(0,1fr)_240px] lg:gap-6">
      <div className="grid content-start gap-2">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="font-display text-[32px] leading-none uppercase">{meta.label}</h2>
          <span className="label text-navy/60">Nightly at {meta.at} · up to {meta.maxSeconds} s</span>
        </div>
        <p className="text-[15px] text-navy/70">{meta.does}</p>
        {last ? (
          <>
            <p className="flex flex-wrap items-center gap-2 text-[15px]">
              <span className={`label px-1.5 py-0.5 ${STAMP[last.status]}`}>{WORD[last.status]}</span>
              <span className="font-semibold">{WAT.format(new Date(last.started_at))}</span>
              <span className="text-navy/60">
                {ago(last.started_at, now)}
                {seconds(last) !== null && ` · ${seconds(last)} s`}
                {last.trigger === "manual" && " · run by hand"}
              </span>
            </p>
            {last.problems.length > 0 && (
              <ul className="grid gap-1 text-[15px] font-semibold text-red-card">
                {last.problems.slice(0, 6).map((p) => (
                  <li key={p}>{p}</li>
                ))}
                {last.problems.length > 6 && <li>and {last.problems.length - 6} more</li>}
              </ul>
            )}
            {summaryLines(last.summary).length > 0 && <p className="font-mono text-[13px] text-navy/70">{summaryLines(last.summary).join(" · ")}</p>}
            <ol className="mt-1 flex flex-wrap gap-1" aria-label="Recent runs, newest first">
              {runs.map((r) => (
                <li key={r.id} title={`${WAT.format(new Date(r.started_at))} · ${WORD[r.status]}`} className={`size-4 ${STAMP[r.status]}`}>
                  <span className="sr-only">
                    {WAT.format(new Date(r.started_at))}: {WORD[r.status]}
                  </span>
                </li>
              ))}
            </ol>
          </>
        ) : (
          <p className="text-[15px] text-navy/60">No runs logged yet.</p>
        )}
      </div>
      <aside className="content-start">
        <RunNow job={job} note={job === "match-data" ? "Spends up to 60 Highlightly calls, shared with live." : job === "fixtures" ? "About 12 Highlightly calls." : undefined} />
      </aside>
    </section>
  );
}
