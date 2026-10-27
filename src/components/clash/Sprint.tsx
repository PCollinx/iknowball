"use client";

import { useState, useTransition } from "react";
import { answerClash, beginSprint, endSprint } from "@/app/(site)/clash/actions";
import type { Card } from "@/lib/clash/data";
import { PENALTY_SECONDS, SPRINT_SECONDS, type Guess } from "@/lib/clash/rules";
import type { Kit } from "@/components/daily/ShirtBack";
import { clock } from "@/components/daily/clock";
import { useRoundClock } from "@/components/daily/useRoundClock";
import { AlbumPage, Pair, PlayerSticker, Slot, type StickerState } from "./Album";
import { KickRow } from "./KickRow";

const RIGHT = ["Ball knowledge.", "Sharp.", "You know ball.", "Oya, next.", "Clinical."];
const WRONG = [
  `Missed. ${PENALTY_SECONDS} seconds off.`,
  `Missed. Off the post, ${PENALTY_SECONDS} off.`,
  `Missed. Wide, ${PENALTY_SECONDS} seconds gone.`,
  `Missed. Over the bar, ${PENALTY_SECONDS} off.`,
];
/** How long the revealed number stays up before the next player. */
const SHOW_MS = 800;

type Shown = Card & { value: number };

type Props = {
  runId: number;
  setCode: string;
  /** The player on show: how many calls the run has made. */
  at: number;
  /** Whether the clock had started when the page rendered. */
  begun: boolean;
  statLabel: string;
  shown: Shown;
  next: Card;
  deadlineAt: string;
  serverNow: number;
  kicks: string;
  currentRun: number;
  bestRun: number;
  /** Club kits by club id; a player without a known club wears the app's own. */
  kits: Record<number, Kit>;
};

/** The sprint, option E (picked 23 Oct 2026): the score bug and the shootout row
 * on top, the two players as shirt stickers on an album page, tap the one with
 * more or Level. A call stamps the sticker "Goal" or "Missed". */
export function Sprint(props: Props) {
  const [shown, setShown] = useState(props.shown);
  const [next, setNext] = useState<Card | null>(props.next);
  const [at, setAt] = useState(props.at);
  const [kicks, setKicks] = useState(props.kicks);
  const [runs, setRuns] = useState({ current: props.currentRun, best: props.bestRun });
  // The call waiting on the server, then its result while the number shows.
  const [call, setCall] = useState<{ guess: Guess; value?: number; right?: boolean } | null>(null);
  const [closing, startClosing] = useTransition();
  const [, startCall] = useTransition();

  const close = () => startClosing(() => endSprint(props.runId));
  const { left, moveDeadline } = useRoundClock({
    deadlineAt: props.deadlineAt,
    serverNow: props.serverNow,
    begun: props.begun,
    limitSeconds: SPRINT_SECONDS,
    begin: () => beginSprint(props.runId, props.setCode),
    onZero: close,
  });
  const over = left === 0 || closing;
  const right = [...kicks].filter((k) => k === "1").length;
  const kit = (c: Card) => (c.clubId !== null ? props.kits[c.clubId] : undefined);

  function answer(guess: Guess) {
    if (call || over || !next) return;
    setCall({ guess });
    startCall(async () => {
      const r = await answerClash(props.runId, props.setCode, at, guess);
      if (r.status === "closed") return close();
      setCall({ guess, value: r.value, right: r.right });
      moveDeadline(r.deadlineAt);
      setKicks((k) => k + (r.right ? "1" : "0"));
      setRuns((s) => {
        const current = r.right ? s.current + 1 : 0;
        return { current, best: Math.max(s.best, current) };
      });
      await new Promise((ok) => setTimeout(ok, SHOW_MS));
      if (r.done || !r.upcoming) return close();
      setShown({ ...next, value: r.value });
      setNext(r.upcoming);
      setAt((i) => i + 1);
      setCall(null);
    });
  }

  const revealed = call?.value !== undefined;
  const low = left <= 10 && !over;
  const feedback = over
    ? "Full time."
    : revealed
      ? call.guess === "level"
        ? call.right
          ? "Level. Spotted."
          : `Not level. ${PENALTY_SECONDS} off.`
        : call.right
          ? RIGHT[right % RIGHT.length]
          : WRONG[kicks.length % WRONG.length]
      : call
        ? "Checking…"
        : runs.current > 1
          ? `Run of ${runs.current}${runs.best > runs.current ? ` · best ${runs.best}` : ""}`
          : "Who has more?";
  const ink = revealed ? (call.right ? "text-royal" : "text-red-card") : "";
  /** The sticker's look once a call is in: the picked one stamped, the other faded. */
  const state = (side: "shown" | "next"): StickerState => {
    if (!revealed || call.guess === "level") return "idle";
    const picked = (call.guess === "fewer") === (side === "shown");
    return picked ? (call.right ? "right" : "wrong") : "faded";
  };

  return (
    <main className="mx-auto w-full max-w-295 flex-1 px-4 pb-6 lg:px-12">
      {/* The score bug (option C's, kept by Collins) with the shootout row beside it. */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2.5 pt-3.5 lg:pt-6">
        <div className="flex items-stretch border-[2.5px] border-navy shadow-[3px_3px_0_var(--color-navy)] max-lg:w-full lg:shadow-[4px_4px_0_var(--color-navy)]">
          <span className="grid place-items-center bg-royal px-2.5 font-display text-lg text-white uppercase lg:px-3.5 lg:text-[22px]">Clash</span>
          <span
            role="timer"
            aria-label={`${left} seconds left`}
            className={`px-3 pt-1 pb-0.5 font-display text-[40px] leading-none text-white tabular-nums lg:px-4 lg:text-[56px] ${low ? "bg-red-card" : "bg-teal"}`}
          >
            {clock(left)}
          </span>
          <span className="flex flex-1 items-center justify-between gap-3.5 bg-navy px-3 text-white lg:px-4">
            <span className="label text-[10px] text-teal-light lg:text-[11px]">Right</span>
            <span className="font-display text-[40px] leading-none tabular-nums lg:text-[56px]">{right}</span>
          </span>
        </div>
        <KickRow kicks={kicks} placeholder size="size-4.5 lg:size-5.5" className="min-w-0 flex-1" />
        <p aria-hidden="true" className={`hidden font-display text-[28px] uppercase lg:block ${ink || "text-royal"}`}>
          {feedback}
        </p>
      </div>

      <AlbumPage label={props.statLabel} className="mx-auto mt-6 max-w-205 lg:mt-9">
        <Pair>
          {(
            [
              ["shown", shown, shown.value],
              ["next", next, revealed ? call.value! : null],
            ] as const
          ).map(([side, card, value]) =>
            card ? (
              <Slot key={`${side}-${card.name}`}>
                <button
                  type="button"
                  onClick={() => answer(side === "shown" ? "fewer" : "more")}
                  disabled={over || Boolean(call)}
                  aria-label={`${card.name} has more`}
                  className="block w-full min-w-0 motion-safe:animate-deal-in disabled:cursor-default"
                >
                  <PlayerSticker name={card.name} kit={kit(card)} value={value} side={side === "shown" ? "left" : "right"} state={state(side)} pop={side === "next" && revealed} />
                </button>
              </Slot>
            ) : null,
          )}
        </Pair>
        <p role="status" className={`mt-3 text-center font-display text-[22px] leading-none uppercase lg:sr-only ${ink}`}>
          {feedback}
        </p>
      </AlbumPage>

      <div className="mx-auto mt-4.5 max-w-205 lg:mt-5 lg:flex lg:justify-center">
        <button
          type="button"
          onClick={() => answer("level")}
          disabled={over || Boolean(call)}
          className="btn-white btn-press flex w-full items-baseline justify-center gap-2.5 p-2.5 font-display text-3xl leading-none uppercase disabled:translate-0 disabled:opacity-60 disabled:shadow-none lg:w-80 lg:text-[32px]"
        >
          = Level <span className="font-sans text-[13px] font-semibold text-slate normal-case lg:text-sm">same number</span>
        </button>
      </div>
    </main>
  );
}
