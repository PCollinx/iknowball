import { startPart } from "@/app/daily/actions";
import { Masthead } from "./Masthead";
import { RecallGrid } from "./RecallGrid";
import { SubmitButton } from "./SubmitButton";
import { splitFixture } from "./fixture";
import type { DailyRow, RecallReveal } from "@/lib/daily/data";
import { clubInTitle, type Club } from "@/lib/profile/club";

const FORMAT = { free_recall: "Free Recall", in_order: "In Order" } as const;
const RULE = {
  free_recall: (n: number) => `Name as many as you can. ${n} to find.`,
  in_order: (n: number) => `Put all ${n} in the right order.`,
};

type Props = { issue: number; dateLabel: string; daily: DailyRow; total: number; before: RecallReveal | null; club: Club | null };

export function KickOff({ issue, dateLabel, daily, total, before, club }: Props) {
  const fixture = before ? before.daily.title : daily.title;
  const [home, away] = splitFixture(fixture);
  const yourLot = clubInTitle(club, fixture);
  return (
    <main className="mx-auto min-h-dvh max-w-[560px] px-4 pb-8">
      <Masthead issue={issue} right={dateLabel} />
      {before && (
        <section className="border-b-[3px] border-double border-navy pb-4">
          <div className="flex items-end justify-between gap-3 py-3.5">
            <div>
              <span className="label">Part 1 · {FORMAT.free_recall}</span>
              <h2 className="mt-1 font-display text-[40px] leading-[0.9] uppercase">
                {home}
                {away && (
                  <>
                    {" "}
                    <span className="text-royal">v</span> {away}
                  </>
                )}
              </h2>
            </div>
            <span className="font-display text-[56px] leading-[0.8] text-royal tabular-nums">
              {before.found.length}
              <small className="text-2xl text-navy">/{before.found.length + before.missed.length}</small>
            </span>
          </div>
          <RecallGrid reveal={before} />
        </section>
      )}
      <section className="py-5">
        <span className="label">
          Part {daily.part} of {total} · {FORMAT[daily.format]}
        </span>
        <h1 className="mt-1 font-display text-[64px] leading-[0.9] uppercase">
          {daily.format === "in_order" ? (
            <>
              In <span className="text-royal">order</span>
            </>
          ) : (
            <>
              {home}
              {away && (
                <>
                  {" "}
                  <span className="text-royal">v</span> {away}
                </>
              )}
            </>
          )}
        </h1>
        <p className="mt-3 max-w-[40ch] text-lg">{daily.prompt}</p>
        {yourLot && (
          <p className="mt-3 border-l-[6px] border-teal px-3 py-2 font-semibold">
            Your lot are on today. Show them what {club!.name} fans know.
          </p>
        )}
        <table className="mt-5 w-full border-collapse text-left">
          <tbody>
            <tr className="border-y border-track">
              <th className="label py-2.5 font-semibold">Clock</th>
              <td className="py-2.5 text-right font-display text-2xl">{daily.time_limit_seconds} seconds</td>
            </tr>
            <tr className="border-b border-track">
              <th className="label py-2.5 font-semibold">Task</th>
              <td className="py-2.5 text-right">{RULE[daily.format](daily.answer_count)}</td>
            </tr>
            <tr className="border-b border-track">
              <th className="label py-2.5 font-semibold">Tries</th>
              <td className="py-2.5 text-right">One. The clock starts when you kick off.</td>
            </tr>
          </tbody>
        </table>
      </section>
      <form action={startPart}>
        <input type="hidden" name="dailyId" value={daily.id} />
        <SubmitButton pendingText="Starting…">{daily.part === 1 ? "Kick off" : "Start Part 2"}</SubmitButton>
      </form>
    </main>
  );
}
