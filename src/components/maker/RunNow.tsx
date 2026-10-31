"use client";

import { useActionState } from "react";
import { runJobNow, type RunState } from "@/app/maker/actions";
import type { JobName } from "@/lib/control/problems";

/** Runs one scheduled job now. The match data job spends Highlightly calls, so it says so. */
export function RunNow({ job, note }: { job: JobName; note?: string }) {
  const [state, action, running] = useActionState<RunState, FormData>(runJobNow, null);
  return (
    <form action={action} className="grid gap-2">
      <input type="hidden" name="job" value={job} />
      <button
        type="submit"
        disabled={running}
        className="btn-white btn-press flex items-center justify-between px-3.5 py-1.5 font-display text-lg uppercase disabled:opacity-50"
      >
        <span>{running ? "Running" : "Run now"}</span>
        <span aria-hidden>→</span>
      </button>
      {note && <p className="text-[13px] text-slate">{note}</p>}
      <p aria-live="polite" className="text-[13px] font-semibold">
        {state && !running && (state.status === "ok" ? <span className="text-royal">Done, no problems.</span> : <span className="text-red-card">{state.problems[0]}</span>)}
      </p>
    </form>
  );
}
