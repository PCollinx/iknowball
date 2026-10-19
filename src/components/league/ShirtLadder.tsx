import { ShirtBack, shirtName } from "@/components/daily/ShirtBack";
import type { TableLine } from "@/lib/league/data";
import { CLASH_MAX, COUNTED_DAYS } from "@/lib/league/week";
import { kitOf } from "@/lib/profile/club";

const WEEK_MAX = COUNTED_DAYS * 100 + CLASH_MAX;

/** The league table as a ladder of shirts ("B · Shirt ladder", picked 19 Oct 2026):
 * each player is their club shirt with their place as the number, a five-step bar
 * for the Daily days banked, the gap to the top and the move since yesterday. */
export function ShirtLadder({ rows }: { rows: TableLine[] }) {
  const lead = rows[0]?.points ?? 0;
  return (
    <ol className="tabular-nums">
      {rows.map((r, i) => {
        const placed = r.points > 0;
        const days = r.counted.length;
        const gap = lead - r.points;
        return (
          <li
            key={r.userId}
            className={`grid grid-cols-[54px_minmax(0,1fr)_auto] items-center gap-2.5 py-2 ${
              r.mine ? "-mx-4 border-b-2 border-royal bg-mist px-4" : "border-b border-track"
            }`}
          >
            <span className="w-[54px]">
              <ShirtBack kit={kitOf(r.club)} num={placed ? r.position : "–"} name={shirtName(r.name)} />
            </span>
            <span className="min-w-0">
              <b className="block truncate font-display text-[22px] leading-[0.95] uppercase">
                {r.mine ? "You" : r.name}
                {r.moved ? (
                  <span className={`ml-1.5 text-sm ${r.moved > 0 ? "text-teal" : "text-red-card"}`}>
                    <span aria-hidden="true">{r.moved > 0 ? "▲" : "▼"}</span>
                    <span className="sr-only">{r.moved > 0 ? "up" : "down"}</span>
                    {Math.abs(r.moved)}
                  </span>
                ) : null}
              </b>
              <span className="label mt-0.5 block truncate text-[10px] text-navy/60">
                {days} of {COUNTED_DAYS} days in{r.clash ? ` · +${r.clash} Clash` : ""}
                {placed ? (i === 0 || gap === 0 ? " · top" : ` · ${gap} behind`) : " · not played"}
              </span>
              <span className="mt-1.5 flex gap-[3px]" aria-hidden="true">
                {Array.from({ length: COUNTED_DAYS }, (_, k) => (
                  <i key={k} className={`h-1.5 flex-1 ${k < days ? "bg-royal" : "bg-track"}`} />
                ))}
              </span>
            </span>
            <span className={`text-right font-display text-[32px] leading-none ${i === 0 && placed ? "text-royal" : ""}`}>
              {r.points}
              <small className="block font-sans text-[11px] leading-tight font-semibold tracking-wider text-navy/60">/ {WEEK_MAX}</small>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
