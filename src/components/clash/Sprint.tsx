"use client";

import { useState, useTransition } from "react";
import { answerClash, endSprint } from "@/app/clash/actions";
import type { Card } from "@/lib/clash/data";
import type { Guess } from "@/lib/clash/rules";
import { ShirtBack, shirtName, type Kit } from "@/components/daily/ShirtBack";
import { clock } from "@/components/daily/clock";
import { useCountdown } from "@/components/daily/useCountdown";
import { ClashMasthead } from "./Masthead";
import { KickRow } from "./KickRow";

const RIGHT = ["Ball knowledge.", "Sharp.", "You know ball.", "Oya, next.", "Clinical."];
const WRONG = ["Saved. 5 seconds off.", "Off the post. 5 off.", "Wide. 5 seconds gone.", "Keeper's ball. 5 off."];
/** How long the revealed number stays up before the next player. */
const SHOW_MS = 800;

type Shown = Card & { value: number };

type Props = {
  runId: number;
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

/** The sprint: two shirts under the tale of the tape, tap the one with more.
 * The shootout row across the top keeps the score. */
export function Sprint(props: Props) {
  const [shown, setShown] = useState(props.shown);
  const [next, setNext] = useState<Card | null>(props.next);
  const [deadlineAt, setDeadlineAt] = useState(props.deadlineAt);
  const [kicks, setKicks] = useState(props.kicks);
  const [runs, setRuns] = useState({ current: props.currentRun, best: props.bestRun });
  // The call waiting on the server, then its result while the number shows.
  const [call, setCall] = useState<{ guess: Guess; value?: number; right?: boolean } | null>(null);
  const [closing, startClosing] = useTransition();
  const [, startCall] = useTransition();

  const close = () => startClosing(() => endSprint(props.runId));
  const left = useCountdown(deadlineAt, props.serverNow, close);
  const over = left === 0 || closing;
  const right = [...kicks].filter((k) => k === "1").length;
  const kit = (c: Card) => (c.clubId !== null ? props.kits[c.clubId] : undefined);

  function answer(guess: Guess) {
    if (call || over || !next) return;
    setCall({ guess });
    startCall(async () => {
      const r = await answerClash(props.runId, guess);
      if (r.status === "closed") return close();
      setCall({ guess, value: r.value, right: r.right });
      setDeadlineAt(r.deadlineAt);
      setKicks((k) => k + (r.right ? "1" : "0"));
      setRuns((s) => {
        const current = r.right ? s.current + 1 : 0;
        return { current, best: Math.max(s.best, current) };
      });
      await new Promise((ok) => setTimeout(ok, SHOW_MS));
      if (r.done || !r.upcoming) return close();
      setShown({ ...next, value: r.value });
      setNext(r.upcoming);
      setCall(null);
    });
  }

  const revealed = call?.value !== undefined;
  const feedback = over
    ? "Full time."
    : revealed
      ? call.right
        ? RIGHT[right % RIGHT.length]
        : WRONG[kicks.length % WRONG.length]
      : call
        ? "Checking…"
        : runs.current > 1
          ? `Run of ${runs.current}${runs.best > runs.current ? ` · best ${runs.best}` : ""}`
          : "Who has more? Tap the shirt.";
  const tone = (side: "shown" | "next") => {
    if (!revealed) return call && (call.guess === "fewer") === (side === "shown") && call.guess !== "level" ? "border-royal" : "border-navy";
    const picked = call.guess !== "level" && (call.guess === "fewer") === (side === "shown");
    return picked ? (call.right ? "border-royal bg-royal/10" : "border-red-card bg-red-card/10") : "border-navy opacity-60";
  };

  return (
    <main className="mx-auto min-h-dvh max-w-[1100px] px-4 pb-6 lg:grid lg:grid-cols-[380px_minmax(0,1fr)] lg:gap-x-12 lg:px-8">
      <div className="lg:col-span-2">
        <ClashMasthead right={props.statLabel} />
      </div>

      <section className="lg:pt-4">
        <div className="flex items-center gap-2.5 pt-3">
          <span
            role="timer"
            aria-label={`${left} seconds left`}
            className={`min-w-[76px] px-2 pt-1 pb-1.5 text-center font-display text-[40px] leading-[0.9] text-white tabular-nums ${left <= 10 && !over ? "bg-red-card" : "bg-teal"}`}
          >
            {clock(left)}
          </span>
          <span className="h-2.5 flex-1 bg-track">
            <span
              className={`block h-full transition-[width] duration-300 ${left <= 10 ? "bg-red-card" : "bg-teal"}`}
              style={{ width: `${Math.min(100, (left / 60) * 100)}%` }}
            />
          </span>
          <span className="font-display text-[40px] leading-[0.9] tabular-nums">
            {right}
            <small className="text-base text-navy/60"> right</small>
          </span>
        </div>
        <KickRow kicks={kicks} placeholder className="border-b-[3px] border-double border-navy py-2.5" />
        <h1 className="mt-3 hidden font-display text-[72px] leading-[0.85] uppercase lg:block">
          Who has <span className="text-royal">more?</span>
        </h1>
        <p className="mt-2 hidden text-lg lg:block">Tap the shirt with the higher number, or Level if you think they&apos;re the same. A wrong call costs 5 seconds.</p>
      </section>

      <section className="lg:pt-4">
        <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2 lg:mt-0">
          <i className="border-t border-navy" />
          <span className="bg-navy px-2 pt-1 pb-1.5 font-display text-xl text-white uppercase lg:text-2xl">{props.statLabel}</span>
          <i className="border-t border-navy" />
        </div>
        <p role="status" className={`mt-2 min-h-[24px] text-center font-semibold ${revealed && !call.right ? "text-red-card" : ""}`}>
          {feedback}
        </p>

        <div className="mt-2 grid grid-cols-2 border-y-[3px] border-double border-navy">
          {(
            [
              ["shown", shown, String(shown.value)],
              ["next", next, revealed ? String(call.value) : "?"],
            ] as const
          ).map(([side, card, num]) =>
            card ? (
              <div key={`${side}-${card.name}`} className={`grid justify-items-center gap-1.5 px-2 pt-3 pb-2.5 text-center ${side === "next" ? "border-l border-navy" : ""}`}>
                <button
                  type="button"
                  onClick={() => answer(side === "shown" ? "fewer" : "more")}
                  disabled={over || Boolean(call)}
                  aria-label={`${card.name} has more`}
                  className={`w-full max-w-[220px] animate-deal-in border-[3px] p-1.5 transition-colors ${tone(side)}`}
                >
                  <ShirtBack kit={kit(card)} name={shirtName(card.name)} num={num} pop={side === "next" && revealed} />
                </button>
                <span className={`font-display text-[64px] leading-[0.8] tabular-nums lg:text-[88px] ${side === "next" && !revealed ? "text-track" : "text-royal"}`}>
                  {side === "next" && !revealed ? "??" : num}
                </span>
                <span className="label">{card.name}</span>
              </div>
            ) : null,
          )}
        </div>

        <button
          type="button"
          onClick={() => answer("level")}
          disabled={over || Boolean(call)}
          className="mt-4 w-full border-[3px] border-royal p-3 font-display text-[30px] text-royal uppercase disabled:opacity-50"
        >
          Level
        </button>
      </section>
    </main>
  );
}
