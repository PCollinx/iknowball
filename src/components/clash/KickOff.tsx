import Link from "next/link";
import type { ReactNode } from "react";
import { startSprint } from "@/app/(site)/clash/actions";
import { SubmitButton } from "@/components/daily/SubmitButton";
import type { Kit } from "@/components/daily/ShirtBack";
import type { Result } from "@/lib/clash/data";
import { SET_SIZE, SPRINT_SECONDS } from "@/lib/clash/rules";
import { AlbumPage, HigherOrLower, Pair, PlayerSticker, RefereesNotes, Slot } from "./Album";
import { KickRow } from "./KickRow";
import { ClashMasthead } from "./Masthead";

// Before a sprint, option E (picked 23 Oct 2026): on a challenge link the
// challenge comes first ("Beat 14." and the setter's strip); a solo sprint gets
// the Higher or lower heading and your best this week. Then a page from the
// album showing what a call looks like, the referee's notes, and the button.

/** The first call of a set: the opening player with their number, the next one hidden. */
export type FirstCall = { first: { name: string; kit?: Kit; value: number }; second: { name: string; kit?: Kit } };

// A solo sprint has no set until kick-off, so its album page shows a call of the
// kind you'll get: Shearer's Newcastle goals against Rooney's at United.
const SOLO_CALL: FirstCall = {
  first: { name: "Alan Shearer", kit: { shirt: "#241F20", number: "#FFFFFF", trim: "#FFFFFF", pattern: "stripes" }, value: 148 },
  second: { name: "Wayne Rooney", kit: { shirt: "#DA291C", number: "#FFFFFF", trim: "#000000", pattern: "sides", collar: "polo" } },
};

type Props = {
  /** The challenge's code, on a challenge link. */
  code?: string;
  statLabel?: string;
  setter?: Result | null;
  /** The challenge's own first call, shown on its album page. */
  firstCall?: FirstCall;
  /** Your best this week and last challenge (solo only), streamed in. */
  best?: ReactNode;
};

export function ClashKickOff({ code, statLabel, setter, firstCall, best }: Props) {
  const challenge = Boolean(code);
  const call = firstCall ?? SOLO_CALL;
  return (
    <main className="mx-auto w-full max-w-295 flex-1 px-4 pb-10 lg:px-12">
      <ClashMasthead left={challenge ? "Clash · Challenge" : "Clash · Sprint"} right={code ?? "60-second sprint"} />
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_420px] lg:items-start lg:gap-14">
        <div className="min-w-0 pt-3.5 lg:pt-6">
          {setter ? (
            <>
              <span className="label text-[10px] text-royal lg:text-xs">{setter.name} sent you a challenge</span>
              <h1 className="mt-1 font-display text-[88px] leading-[0.8] uppercase lg:text-[128px]">
                Beat <span className="sash-mark">{setter.right}.</span>
              </h1>
              <div className="mt-3 flex max-w-140 items-stretch border-[2.5px] border-navy shadow-[3px_3px_0_var(--color-navy)] lg:mt-4">
                <span className="grid max-w-[40%] place-items-center truncate bg-royal px-2.5 font-display text-base text-white uppercase lg:text-xl">{setter.name}</span>
                <span className="bg-teal px-2.5 pt-1 pb-0.5 font-display text-[34px] leading-none text-white tabular-nums lg:text-[44px]">{setter.right}</span>
                <span className="flex flex-1 items-center bg-navy px-2 py-1">
                  <KickRow kicks={setter.kicks} size="size-3 lg:size-4" className="gap-0.5" />
                </span>
              </div>
              <p className="mt-2.5 text-sm leading-snug lg:mt-3 lg:text-base">
                Same {SET_SIZE} players, same order, {SPRINT_SECONDS} seconds. One go each, so make it count.
              </p>
            </>
          ) : (
            <>
              <HigherOrLower className="text-[60px] min-[380px]:text-[72px] lg:text-[100px]" />
              <span className="label mt-3 block text-[10px] text-royal lg:mt-3.5 lg:text-[11px]">
                {SPRINT_SECONDS} seconds · {SET_SIZE} players · {statLabel ?? "league goals or games for a club"}
              </span>
              {best}
            </>
          )}

          <AlbumPage label={firstCall && statLabel ? statLabel : "League goals for the club"} className="mt-7 max-w-140 lg:mt-8">
            <Pair>
              <Slot>
                <PlayerSticker name={call.first.name} kit={call.first.kit} value={call.first.value} side="left" />
              </Slot>
              <Slot>
                <PlayerSticker name={call.second.name} kit={call.second.kit} value={null} side="right" />
              </Slot>
            </Pair>
            <p className="mt-3 text-center text-[13px] lg:mt-4 lg:text-sm">
              {firstCall ? "Your first call. Who has more?" : "How a call looks. Who has more?"}
            </p>
          </AlbumPage>
        </div>

        <div className="mt-7 grid gap-6 lg:mt-0 lg:gap-7 lg:pt-6">
          <RefereesNotes />
          <form action={startSprint}>
            {code && <input type="hidden" name="code" value={code} />}
            <SubmitButton tone="teal" pendingText="Picking players…">
              {challenge ? "Take it on" : "Kick off"}
            </SubmitButton>
          </form>
        </div>
      </div>
    </main>
  );
}

/** Your best this week and your latest challenge, as a strip under the heading. */
export function YourBest({ best, lastCode }: { best: number | null; lastCode: string | null }) {
  if (best === null && !lastCode) return null;
  return (
    <div className="mt-3 inline-flex max-w-full items-stretch border-[2.5px] border-navy shadow-[4px_4px_0_var(--color-navy)]">
      <span className="grid place-items-center bg-royal px-2.5 font-display text-base text-white uppercase lg:px-3 lg:text-lg">Your best</span>
      <span className="bg-teal px-3 pt-1 pb-0.5 font-display text-[32px] leading-none text-white tabular-nums lg:px-3.5 lg:text-[40px]">{best ?? "–"}</span>
      {lastCode && (
        <Link href={`/clash/${lastCode}`} className="flex min-w-0 items-center gap-2 bg-navy px-3 text-white lg:gap-2.5 lg:px-3.5">
          <span className="label hidden text-[10px] text-teal-light min-[400px]:inline lg:text-[11px]">This week&apos;s challenge</span>
          <span className="font-display tracking-[0.08em]">{lastCode} ↗</span>
        </Link>
      )}
    </div>
  );
}
