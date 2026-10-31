import type { ReactNode } from "react";
import { startSprint } from "@/app/(site)/clash/actions";
import { SubmitButton } from "@/components/daily/SubmitButton";
import type { Kit } from "@/components/daily/ShirtBack";
import type { Result } from "@/lib/clash/data";
import { STATS, type Stat } from "@/lib/clash/rules";
import { AlbumPage, Pair, PlayerSticker, RefereesNotes, Slot } from "./Album";
import { ChallengeBoard, SoloBoard } from "./Board";

// Before a sprint, option E (picked 23 Oct 2026) under the scoreboard header
// (option D, 28 Oct 2026, Board.tsx): solo, the board carries the call and your
// best this week; on a challenge link it's the setter's score against yours,
// then "Beat 14.". Then a page from the album showing what a call looks like,
// the referee's notes, and the button.

/** The first call of a set: the opening player with their number, the next one hidden. */
export type FirstCall = { first: { name: string; kit?: Kit; value: number }; second: { name: string; kit?: Kit } };

// A solo sprint has no set until kick-off, so its album page shows a call of
// the kind you'll get on today's stat, with real numbers.
const NEWCASTLE: Kit = { shirt: "#241F20", number: "#FFFFFF", trim: "#FFFFFF", pattern: "stripes" };
const MAN_UNITED: Kit = { shirt: "#DA291C", number: "#FFFFFF", trim: "#000000", pattern: "sides", collar: "polo" };
const LIVERPOOL: Kit = { shirt: "#C8102E", number: "#FFFFFF", trim: "#FFFFFF" };
const MAN_CITY: Kit = { shirt: "#6CABDD", number: "#FFFFFF", trim: "#1C2C5B", collar: "polo" };
const ARSENAL: Kit = { shirt: "#EF0107", number: "#FFFFFF", trim: "#FFFFFF", pattern: "sleeves" };
const CHELSEA: Kit = { shirt: "#034694", number: "#FFFFFF", trim: "#FFFFFF" };

export const SOLO_CALLS: Record<Stat, FirstCall> = {
  goals: { first: { name: "Alan Shearer", kit: NEWCASTLE, value: 148 }, second: { name: "Wayne Rooney", kit: MAN_UNITED } },
  apps: { first: { name: "Steven Gerrard", kit: LIVERPOOL, value: 504 }, second: { name: "Ryan Giggs", kit: MAN_UNITED } },
  height: { first: { name: "Peter Crouch", kit: LIVERPOOL, value: 201 }, second: { name: "Sergio Agüero", kit: MAN_CITY } },
  years: { first: { name: "Thierry Henry", kit: ARSENAL, value: 8 }, second: { name: "John Terry", kit: CHELSEA } },
  clubs: { first: { name: "Nicolas Anelka", kit: CHELSEA, value: 12 }, second: { name: "Ryan Giggs", kit: MAN_UNITED } },
  sample: { first: { name: "Alan Shearer", kit: NEWCASTLE, value: 260 }, second: { name: "Wayne Rooney", kit: MAN_UNITED } },
};

type Props = {
  /** The challenge's code, on a challenge link. */
  code?: string;
  /** Today's stat, solo; the set's own on a challenge link. */
  stat: Stat;
  setter?: Result | null;
  /** The challenge's own first call, shown on its album page. */
  firstCall?: FirstCall;
  /** Your best this week and last challenge (solo only), streamed into the board's last cell. */
  best?: ReactNode;
  /** Your three this week and your challenges (solo only), streamed in above the referee's notes. */
  three?: ReactNode;
};

export function ClashKickOff({ code, stat, setter, firstCall, best, three }: Props) {
  const challenge = Boolean(code);
  const call = firstCall ?? SOLO_CALLS[stat];
  const { label: statLabel, ask } = STATS[stat];
  return (
    <main className="mx-auto w-full max-w-295 flex-1 px-4 pb-10 lg:px-12">
      {setter && code ? (
        <ChallengeBoard code={code} setter={setter.name} right={setter.right} statLabel={statLabel} />
      ) : (
        <SoloBoard stat={stat} best={best} label={code ? `Clash · Challenge ${code}` : undefined} />
      )}
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_420px] lg:items-start lg:gap-14">
        <div className="min-w-0 pt-5 lg:pt-8">
          {setter && (
            <>
              <h1 className="font-display text-[64px] leading-[0.82] uppercase lg:text-[88px]">Beat {setter.right}.</h1>
              <p className="mt-2 text-sm leading-snug lg:text-base">{setter.name} sent you this one. One go each, so make it count.</p>
            </>
          )}

          <AlbumPage label={statLabel} className={`${setter ? "mt-7 lg:mt-8" : "mt-4 lg:mt-3"} max-w-140`}>
            <Pair>
              <Slot>
                <PlayerSticker name={call.first.name} kit={call.first.kit} value={call.first.value} side="left" />
              </Slot>
              <Slot>
                <PlayerSticker name={call.second.name} kit={call.second.kit} value={null} side="right" />
              </Slot>
            </Pair>
            <p className="mt-3 text-center text-[13px] lg:mt-4 lg:text-sm">
              {firstCall ? `Your first call. ${ask}` : `How a call looks. ${ask}`}
            </p>
          </AlbumPage>
        </div>

        <div className="mt-7 grid gap-6 lg:mt-0 lg:gap-7 lg:pt-8">
          {three}
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
