import { startPart } from "@/app/(site)/daily/actions";
import { Masthead } from "./Masthead";
import { RecallGrid } from "./RecallGrid";
import type { Kit } from "./ShirtBack";
import { SubmitButton } from "./SubmitButton";
import { FixtureTitle } from "./FixtureTitle";
import { FORMAT_NAME, FORMAT_RULE } from "./formats";
import type { DailyRow, RecallReveal } from "@/lib/daily/data";
import { clubInTitle, type Club } from "@/lib/profile/club";


type Props = { issue: number; dateLabel: string; daily: DailyRow; total: number; before: RecallReveal | null; club: Club | null; kit: Kit | null };

export function KickOff({ issue, dateLabel, daily, total, before, club, kit }: Props) {
  const fixture = before ? before.daily.title : daily.title;
  const yourLot = clubInTitle(club, fixture);
  return (
    <main className="mx-auto w-full flex-1 max-w-[560px] px-4 pb-8">
      <Masthead issue={issue} right={dateLabel} />
      {before && (
        <section className="border-b-[3px] border-double border-navy pb-4">
          <div className="flex items-end justify-between gap-3 py-3.5">
            <div className="@container min-w-0 flex-1">
              <span className="label">Part 1 · {FORMAT_NAME[before.daily.format]}</span>
              <FixtureTitle as="h2" title={fixture} className="mt-1 text-[min(40px,var(--fit))]" />
            </div>
            <span className="font-display text-[56px] leading-[0.8] text-royal tabular-nums">
              {before.found.length}
              <small className="text-2xl text-navy">/{before.found.length + before.missed.length}</small>
            </span>
          </div>
          <RecallGrid reveal={before} kit={kit} />
        </section>
      )}
      <section className="@container py-5">
        <span className="label">
          Part {daily.part} of {total} · {FORMAT_NAME[daily.format]}
        </span>
        {daily.part === 2 ? (
          <h1 className="mt-1 font-display text-[64px] leading-[0.9] uppercase">
            {daily.format === "era" ? "Era" : "In"} <span className="text-royal">{daily.format === "era" ? "picks" : "order"}</span>
          </h1>
        ) : (
          <FixtureTitle title={fixture} className="mt-1 text-[min(64px,var(--fit))]" />
        )}
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
              <td className="py-2.5 text-right">{FORMAT_RULE[daily.format](daily.answer_count)}</td>
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
