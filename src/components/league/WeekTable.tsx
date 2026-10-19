import { ShirtBack } from "@/components/daily/ShirtBack";
import type { TableLine } from "@/lib/league/data";
import { kitOf } from "@/lib/profile/club";
import { DAY_HEADS } from "./format";

type Props = {
  rows: TableLine[];
  /** Index of today in the week (0 Monday … 6 Sunday); later days are still to come. */
  today: number;
  /** Draw a red cut under this many places (the podium); 0 for none. */
  cut?: number;
};

/** The league table from the back of a matchday programme ("A · Back page"): all
 * seven days per row, the five that count in royal, dropped ones struck through. */
export function WeekTable({ rows, today, cut = 3 }: Props) {
  return (
    <>
      <table className="w-full table-fixed border-collapse tabular-nums">
        <thead>
          <tr className="border-b-2 border-navy">
            <th className="label w-7 py-1.5 text-left text-[10px] text-navy/60 sm:w-10" />
            <th className="label py-1.5 text-left text-[10px] text-navy/60">Player</th>
            {DAY_HEADS.map((d, i) => (
              <th key={i} className={`label w-[22px] py-1.5 text-center text-[10px] text-navy/60 sm:w-9 ${i === today ? "bg-mist" : ""}`}>
                {d}
              </th>
            ))}
            <th className="label w-11 py-1.5 text-right text-[10px] text-navy/60 sm:w-16">Pts</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const counted = new Set(r.counted);
            const cutHere = cut > 0 && i === cut - 1 && rows.length > cut;
            return (
              <tr
                key={r.userId}
                className={`${r.mine ? "bg-royal text-white" : ""} ${cutHere ? "border-b-2 border-dashed border-red-card" : r.mine ? "" : "border-b border-track"}`}
              >
                <td className="py-1.5 font-display text-[22px] leading-none sm:text-[26px]">{r.points > 0 ? r.position : "–"}</td>
                <td className="truncate py-1.5 pr-1 text-sm font-semibold sm:text-base">
                  <span className="mr-1.5 inline-block w-[18px] align-[-5px] sm:w-6 sm:align-[-7px]">
                    <ShirtBack kit={kitOf(r.club)} />
                  </span>
                  {r.mine ? "You" : r.name}
                </td>
                {r.days.map((score, d) => {
                  const state = d > today ? "later" : score === null ? "miss" : counted.has(d) ? "best" : "drop";
                  return (
                    <td
                      key={d}
                      className={`py-1.5 text-center font-display text-[13px] leading-none sm:text-base ${d === today && !r.mine ? "bg-mist" : ""} ${
                        state === "best" ? (r.mine ? "text-teal-light" : "text-royal") : state === "drop" ? `line-through ${r.mine ? "text-white/55" : "text-navy/55"}` : r.mine ? "text-white/40" : "text-track"
                      }`}
                    >
                      {state === "later" ? "" : (score ?? "–")}
                    </td>
                  );
                })}
                <td className="py-1.5 text-right font-display text-[24px] leading-none sm:text-[30px]">{r.points}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="flex flex-wrap gap-x-4 gap-y-1 py-2 text-xs text-navy/65">
        <span>
          <b className="font-display text-sm text-royal">90</b> counts
        </span>
        <span>
          <b className="font-display text-sm line-through">62</b> dropped
        </span>
        <span>
          <b className="font-display text-sm text-track">–</b> not played
        </span>
        {cut > 0 && rows.length > cut && (
          <span>
            <b className="font-display text-sm text-red-card">- - -</b> podium
          </span>
        )}
      </p>
    </>
  );
}
