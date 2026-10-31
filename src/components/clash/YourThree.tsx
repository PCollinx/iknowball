import { CLASH_MAX, COUNTED_SPRINTS } from "@/lib/league/week";
import { threeLine, threeTotal } from "@/lib/clash/rules";

// Your three (Collins, 31 Oct 2026, mocks at
// https://claude.ai/artifact/V7SuwLBLP6oSZwyw7norBW): the week's three counted
// sprints, highest first. Once all three are filled the lowest is the score to
// beat, so every sprint has a target and playing again can only help. Empty
// slots are dashed.

const slotsOf = (three: number[]) => Array.from({ length: COUNTED_SPRINTS }, (_, i) => three[i] ?? null);
/** Whether the last slot is the one to beat: all filled and short of full marks. */
const toBeat = (three: number[]) => three.length === COUNTED_SPRINTS && threeTotal(three) < CLASH_MAX;

/** The kick-off's sticker: heading, total, three slots and the line under them. */
export function YourThree({ three }: { three: number[] }) {
  const beat = toBeat(three);
  return (
    <section className="border-[3px] border-navy bg-white p-3 shadow-[4px_4px_0_var(--color-navy)] lg:p-4" aria-label="Your three this week">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-[22px] leading-none uppercase lg:text-2xl">Your three · this week</h2>
        <span className="font-display text-[28px] leading-none tabular-nums lg:text-[32px]">
          {threeTotal(three)}
          <span className="text-[15px] text-slate">/{CLASH_MAX}</span>
        </span>
      </div>
      <ol className="mt-4 grid grid-cols-3 gap-2">
        {slotsOf(three).map((v, i) => (
          <li
            key={i}
            className={`relative flex min-h-16 flex-col items-center justify-center border-2 border-navy py-1.5 ${
              v === null ? "border-dashed bg-white" : beat && i === COUNTED_SPRINTS - 1 ? "bg-teal-light" : "bg-mist"
            }`}
          >
            <span className={`font-display text-[34px] leading-[0.9] tabular-nums ${v === null ? "text-track" : ""}`}>{v ?? "–"}</span>
            <span className="label text-[10px] text-slate">{v === null ? "Empty" : `Sprint ${i + 1}`}</span>
            {beat && i === COUNTED_SPRINTS - 1 && (
              <span className="label absolute -top-2.5 -right-1.5 rotate-[4deg] bg-red-card px-1.5 py-px text-[9px] text-white">To beat</span>
            )}
          </li>
        ))}
      </ol>
      <p className="mt-2 text-sm lg:text-[15px]">{threeLine(three)}</p>
    </section>
  );
}

/** The home ticket's row: three small slots, the lowest marked when it's the one to beat. */
export function MiniThree({ three }: { three: number[] }) {
  const beat = toBeat(three);
  return (
    <ol className="grid grid-cols-3 gap-1.5" aria-label={`Your three this week: ${three.join(", ") || "none yet"}`}>
      {slotsOf(three).map((v, i) => (
        <li
          key={i}
          className={`border-2 border-navy py-0.5 text-center font-display text-xl tabular-nums lg:text-2xl ${
            v === null ? "border-dashed bg-white text-track" : beat && i === COUNTED_SPRINTS - 1 ? "bg-teal-light" : "bg-mist"
          }`}
        >
          {v ?? "–"}
        </li>
      ))}
    </ol>
  );
}
