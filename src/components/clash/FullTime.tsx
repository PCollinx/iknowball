import { startSprint } from "@/app/clash/actions";
import { SubmitButton } from "@/components/daily/SubmitButton";
import { ordinal } from "@/components/daily/formats";
import type { Result } from "@/lib/clash/data";
import { ChallengeButton } from "./ChallengeButton";
import { ClashMasthead } from "./Masthead";
import { KickRow } from "./KickRow";

type Props = {
  code: string;
  statLabel: string;
  right: number;
  kicks: string;
  bestRun: number;
  /** Everyone's go at this set, best first. */
  table: Result[];
  siteUrl: string;
};

function banter(right: number, setter: Result | null, mine: Result | null): string {
  if (setter && mine && !mine.setter) {
    if (mine.right > setter.right) return `You beat ${setter.name} by ${mine.right - setter.right}. Send it back to them.`;
    if (mine.right === setter.right) return `Level with ${setter.name}. Somebody needs a replay.`;
    return `${setter.name} had ${setter.right}. ${setter.right - mine.right} short. Run it back.`;
  }
  if (right >= 20) return "Twenty-plus in a minute. That's ball knowledge.";
  if (right >= 12) return "Decent shift. Now dare your mates to beat it.";
  return "Warm-up's done. The next one counts.";
}

export function ClashFullTime({ code, statLabel, right, kicks, bestRun, table, siteUrl }: Props) {
  const missed = kicks.length - right;
  const setter = table.find((r) => r.setter) ?? null;
  const mine = table.find((r) => r.mine) ?? null;
  const position = mine ? table.indexOf(mine) + 1 : null;
  const url = `${siteUrl.replace(/\/$/, "")}/clash/${code}`;

  return (
    <main className="mx-auto min-h-dvh max-w-[1100px] px-4 pb-10 lg:grid lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-x-12 lg:px-8">
      <div className="lg:col-span-2">
        <ClashMasthead right="Full time" />
      </div>

      <section>
        <div className="grid grid-cols-[1fr_auto] items-end gap-2 border-b-[3px] border-double border-navy pt-3.5 pb-2.5">
          <div>
            <span className="label">{statLabel} · 60 seconds</span>
            <div className="font-display text-[140px] leading-[0.78] text-royal tabular-nums lg:text-[184px]">
              {right}
              <small className="text-[40px] text-navy lg:text-[56px]"> right</small>
            </div>
          </div>
          <span className="mb-2 -rotate-3 border-4 border-red-card px-2.5 pt-1 pb-1.5 font-display text-[26px] text-red-card uppercase">
            {missed === 0 ? "Clean sheet" : `${missed} missed`}
          </span>
        </div>
        <KickRow kicks={kicks} className="py-3" />
        <p className="border-l-[6px] border-red-card px-3 py-2.5 text-[17px] font-semibold">{banter(right, setter, mine)}</p>

        <dl className="mt-4 grid grid-cols-3 border-t-2 border-navy">
          {[
            ["Best run", bestRun],
            ["Missed", missed],
            ["Answered", kicks.length],
          ].map(([k, v], i) => (
            <div key={k} className={`py-2 ${i ? "border-l border-track pl-3" : ""}`}>
              <dd className="font-display text-[34px] leading-none">{v}</dd>
              <dt className="label text-navy/70">{k}</dt>
            </div>
          ))}
        </dl>
      </section>

      <aside className="mt-6 lg:mt-0 lg:pt-3.5">
        <div className="border-[3px] border-navy p-4">
          <h2 className="font-display text-[40px] leading-[0.9] uppercase">
            Settle <span className="text-royal">it</span>
          </h2>
          <p className="mt-1 mb-3 text-[15px]">Your mates get the same players in the same order, with your {right} to beat.</p>
          <p className="mb-3 border-2 border-dashed border-royal p-2.5 font-semibold break-all text-royal">{url.replace(/^https?:\/\//, "")}</p>
          <ChallengeButton url={url} text={`I got ${right} right in 60 seconds of Higher or Lower on iKnowBall. Beat that.`} />
        </div>

        {table.length > 1 && (
          <div className="mt-5">
            <span className="label">This challenge{position ? ` · you're ${ordinal(position)} of ${table.length}` : ""}</span>
            <table className="mt-1 w-full border-collapse tabular-nums">
              <tbody>
                {table.slice(0, 10).map((r, i) => (
                  <tr key={i} className={r.mine ? "bg-royal text-white" : "border-b border-track"}>
                    <td className="w-10 py-2 pl-1 font-display text-2xl">{i + 1}</td>
                    <td className="py-2 font-semibold">
                      {r.name}
                      {r.setter && <span className={`ml-2 text-[13px] font-normal ${r.mine ? "text-white/80" : "text-navy/60"}`}>Set it</span>}
                    </td>
                    <td className="py-2 pr-1 text-right font-display text-2xl">{r.right}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <form action={startSprint} className="mt-5">
          <SubmitButton pendingText="Picking players…">New sprint</SubmitButton>
        </form>
      </aside>
    </main>
  );
}
