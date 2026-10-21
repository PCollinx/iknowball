import { startSprint } from "@/app/(site)/clash/actions";
import { SubmitButton } from "@/components/daily/SubmitButton";
import { PENALTY_SECONDS, SPRINT_SECONDS } from "@/lib/clash/rules";
import type { Result } from "@/lib/clash/data";
import { ClashMasthead } from "./Masthead";
import { KickRow } from "./KickRow";

/** Before a sprint: the rules, and on a challenge link, the score to beat. */
export function ClashKickOff({ code, statLabel, setter }: { code?: string; statLabel?: string; setter?: Result | null }) {
  return (
    <main className="mx-auto w-full flex-1 max-w-[1100px] px-4 pb-10 lg:grid lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-x-12 lg:px-8">
      <div className="lg:col-span-2">
        <ClashMasthead right={statLabel ?? "Higher or lower"} />
      </div>
      <section>
        <h1 className="border-b-[3px] border-double border-navy pt-5 pb-4 font-display text-[76px] leading-[0.82] uppercase sm:text-[104px] lg:text-[128px]">
          {setter ? (
            <>
              Beat <span className="text-royal">{setter.right}.</span>
            </>
          ) : (
            <>
              Higher or <span className="text-royal">lower</span>
            </>
          )}
        </h1>
        {setter && (
          <div className="mt-4">
            <p className="text-xl font-semibold">{setter.name} got {setter.right} right in a minute. Same players, same order. Your go.</p>
            <KickRow kicks={setter.kicks} className="mt-3" />
          </div>
        )}
        <ol className="mt-5 border-t-2 border-navy">
          {[
            ["Clock", `${SPRINT_SECONDS} seconds, on our clock, not your phone's.`],
            ["Call", "Two shirts, one number. Tap the player with more, or Level if it's the same."],
            ["Miss", `A wrong call takes ${PENALTY_SECONDS} seconds off and breaks your run.`],
            ["Settle it", "At full time you get a link. Your mates play the exact same set."],
          ].map(([k, line], i) => (
            <li key={k} className="grid grid-cols-[40px_1fr] gap-x-2 border-b border-track py-3">
              <span className="font-display text-[32px] leading-none text-royal">{i + 1}</span>
              <span>
                <span className="block font-display text-[26px] leading-none uppercase">{k}</span>
                <span className="mt-1 block text-[15px] text-navy/80">{line}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>
      <aside className="mt-6 lg:mt-0 lg:pt-5">
        <form action={startSprint} className="border-[3px] border-navy p-4">
          {code && <input type="hidden" name="code" value={code} />}
          <span className="label">{statLabel ?? "A new stat every sprint"}</span>
          <p className="mt-1 mb-4 font-display text-[40px] leading-[0.9] uppercase">
            60 seconds. <span className="text-royal">Go.</span>
          </p>
          <SubmitButton pendingText="Picking players…">Kick off</SubmitButton>
        </form>
      </aside>
    </main>
  );
}
