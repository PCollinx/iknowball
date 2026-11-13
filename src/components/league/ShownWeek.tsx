import { seasonLabel, seasonOf } from "@/lib/time";
import type { Week } from "@/lib/league/data";
import { weekLabel } from "./format";

type Shown = { kind: "week"; n: number | null; week: Week; final: boolean } | { kind: "season"; weeks: number };

/** The line under the matchweek strip: the season and its weeks, or a week's
 * number and dates with a red Full time stamp (a finished week) or Live. */
export function ShownWeek({ shown, today }: { shown: Shown; today: string }) {
  return (
    <div className="mt-3.5 flex items-center justify-between gap-3 lg:mt-4">
      <span className="label text-[10px] lg:text-[11px]">
        {shown.kind === "season"
          ? `Season ${seasonLabel(seasonOf(today))} · ${shown.weeks === 1 ? "Week 1" : `Weeks 1–${shown.weeks}`}`
          : `${shown.n ? `Week ${shown.n} · ` : ""}${weekLabel(shown.week)}`}
      </span>
      {shown.kind === "week" && shown.final && (
        <span className="-rotate-3 border-[3px] border-red-card px-2 pt-0.5 font-display text-lg leading-none text-red-card uppercase">Full time</span>
      )}
      {shown.kind === "week" && !shown.final && <span className="label text-[10px] text-teal lg:text-[11px]">Live</span>}
    </div>
  );
}
