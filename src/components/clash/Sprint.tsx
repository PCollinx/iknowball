"use client";

import { useState, useTransition } from "react";
import { answerClash, beginSprint, endSprint } from "@/app/(site)/clash/actions";
import type { Card } from "@/lib/clash/data";
import { PENALTY_SECONDS, SPRINT_SECONDS, type Guess } from "@/lib/clash/rules";
import type { Kit } from "@/components/daily/ShirtBack";
import { ClockFace } from "@/components/daily/InPlay";
import { useRoundClock } from "@/components/daily/useRoundClock";
import { ShirtBack, shirtName } from "@/components/daily/ShirtBack";
import type { StickerState } from "./Album";

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
  /** The stat's question while nothing is called: "Who's taller?". */
  ask: string;
  /** The stat in a word or two, over the call: "Goals". */
  statShort: string;
  /** The players so far with their numbers, the last man last. */
  history: Shown[];
  /** Club names by id, for the chain. */
  clubNames: Record<number, string>;
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

/** The sprint, one screen tall (Collins, 7 Nov 2026, option B2 of
 * https://claude.ai/artifact/K9hKzwrfPyrqc2ipUDErWT): the score bug, the chain
 * of players so far, then the call on a navy slant, the last man against the
 * next, Level on the line. Tap the half with more; a call stamps it "Goal" or
 * "Missed" and the new player joins the chain. */
export function Sprint(props: Props) {
  const [shown, setShown] = useState(props.shown);
  // Every player so far with his number, up to the last man: the chain.
  const [chain, setChain] = useState<Shown[]>(props.history);
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
      setChain((c) => [...c, { ...next, value: r.value }]);
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
          : props.ask;
  const ink = revealed ? (call.right ? "text-royal" : "text-red-card") : "";
  /** The sticker's look once a call is in: the picked one stamped, the other faded. */
  const state = (side: "shown" | "next"): StickerState => {
    if (!revealed || call.guess === "level") return "idle";
    const picked = (call.guess === "fewer") === (side === "shown");
    return picked ? (call.right ? "right" : "wrong") : "faded";
  };

  return (
    <main data-full-screen className="mx-auto flex min-h-0 w-full max-w-[720px] flex-1 flex-col gap-2.5 px-4 pt-3 pb-3.5 lg:gap-4 lg:pt-5 lg:pb-6">
      {/* The score bug (option C's, kept by Collins). */}
      <div className="flex shrink-0 items-stretch border-[2.5px] border-navy shadow-[3px_3px_0_var(--color-navy)] lg:shadow-[4px_4px_0_var(--color-navy)]">
        <span className="grid place-items-center bg-royal px-2.5 font-display text-lg text-white uppercase lg:px-3.5 lg:text-[22px]">Clash</span>
        <span
          role="timer"
          aria-label={`${left} seconds left`}
          className={`px-3 pt-1 pb-0.5 font-display text-[40px] leading-none text-white tabular-nums lg:px-4 lg:text-[52px] ${low ? "bg-red-card" : "bg-teal"}`}
        >
          <ClockFace left={left} />
        </span>
        <span className="flex flex-1 items-center justify-between gap-3.5 bg-navy px-3 text-white lg:px-4">
          <span className="label text-[10px] text-teal-light lg:text-[11px]">Right</span>
          <span className="font-display text-[40px] leading-none tabular-nums lg:text-[52px]">{right}</span>
        </span>
      </div>

      {/* The chain (Collins, 7 Nov 2026, option B of the full-screen mocks): every player so far, newest at the foot. */}
      <ol
        aria-label="Your run so far"
        className={`relative flex max-h-[46%] min-h-0 shrink flex-col justify-end overflow-hidden border-[2.5px] border-b-0 border-navy ${
          chain.length > 3 ? "before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:z-10 before:h-10 before:bg-linear-to-b before:from-white before:to-transparent" : ""
        }`}
      >
        {chain.map((c, i) => (
          <ChainRow key={i} name={c.name} club={c.clubId !== null ? props.clubNames[c.clubId] : undefined} kit={kit(c)} value={c.value} mark={i === 0 ? null : kicks[i - 1] === "1"} />
        ))}
      </ol>

      {/* The call, B2 "The slant": the last man on the dark side, the new player on teal, Level on the line. */}
      <section aria-label="The call" className="-mt-2.5 flex min-h-[300px] flex-1 flex-col bg-navy text-white lg:-mt-4">
        <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2 px-3 pt-3">
          <span className="min-w-0">
            <span className="label block text-[10px] text-teal-light">Last man</span>
            <span className="block truncate font-display text-[22px] leading-[0.95] uppercase lg:text-3xl">{shown.name}</span>
          </span>
          <span className="label pb-0.5 text-center text-[9px] text-white/65 lg:text-[10px]">{props.statShort}</span>
          <span className="min-w-0 text-right">
            <span className="label block text-[10px] text-teal-light">Next up</span>
            <span className="block truncate font-display text-[22px] leading-[0.95] uppercase lg:text-3xl">{next?.name ?? ""}</span>
          </span>
        </div>

        <div className="relative mt-2 min-h-0 flex-1">
          {(
            [
              ["shown", shown, shown.value],
              ["next", next, revealed ? call.value! : null],
            ] as const
          ).map(([side, card, value]) =>
            card ? (
              <button
                key={`${side}-${card.name}-${at}`}
                type="button"
                onClick={() => answer(side === "shown" ? "fewer" : "more")}
                disabled={over || Boolean(call)}
                aria-label={`${card.name} has more`}
                className={`absolute inset-y-0 flex items-center justify-center disabled:cursor-default ${
                  side === "shown"
                    ? "left-0 right-1/2 bg-[#19224a] pr-[9%] [clip-path:polygon(0_0,100%_0,82%_100%,0_100%)]"
                    : "right-0 left-[46%] bg-teal pl-[11%] [clip-path:polygon(18%_0,100%_0,100%_100%,0_100%)]"
                } ${state(side) === "faded" ? "opacity-55" : ""}`}
              >
                <span className={`block h-[72%] max-h-56 motion-safe:animate-deal-in ${state(side) === "right" || state(side) === "wrong" ? "-translate-y-1.5" : ""}`}>
                  <span className="block aspect-[100/104] h-full">
                    <ShirtBack kit={kit(card)} name={shirtName(card.name)} num={value === null ? "?" : String(value)} pop={side === "next" && revealed} />
                  </span>
                </span>
                {(state(side) === "right" || state(side) === "wrong") && (
                  <span
                    aria-hidden="true"
                    className={`absolute top-[28%] left-1/2 -translate-x-1/2 -rotate-12 border-[3px] bg-white/90 px-2 font-display text-[28px] whitespace-nowrap uppercase lg:text-[40px] ${state(side) === "right" ? "border-royal text-royal" : "border-red-card text-red-card"}`}
                  >
                    {state(side) === "right" ? "Goal" : "Missed"}
                  </span>
                )}
              </button>
            ) : null,
          )}
          <span aria-hidden="true" className="burst pointer-events-none absolute top-[36%] left-1/2 z-10 grid size-14 -translate-x-1/2 -translate-y-1/2 place-items-center bg-red-card font-display text-xl text-white lg:size-18 lg:text-2xl">
            VS
          </span>
          <button
            type="button"
            onClick={() => answer("level")}
            disabled={over || Boolean(call)}
            className="btn-press absolute bottom-2.5 left-1/2 z-20 flex -translate-x-1/2 flex-col items-center border-[2.5px] border-navy bg-white px-3 pt-0.5 pb-1 text-navy shadow-[3px_3px_0_var(--color-sky)] disabled:opacity-60"
          >
            <span className="font-display text-[34px] leading-[0.8]">=</span>
            <span className="label text-[10px]">Level</span>
          </button>
        </div>

        <p role="status" className={`m-3 border-[2.5px] border-navy bg-white px-2 pt-2 pb-1.5 text-center font-display text-[22px] leading-none uppercase shadow-[3px_3px_0_var(--color-sky)] lg:text-[26px] ${ink || "text-navy"}`}>
          {call || over || runs.current > 1 ? feedback : "↑ Tap who has more ↑"}
        </p>
      </section>
    </main>
  );
}

/** One player in the chain: shirt, name and club, his number, and whether the call that brought him on was right. */
function ChainRow({ name, club, kit, value, mark }: { name: string; club?: string; kit?: Kit; value: number; mark: boolean | null }) {
  return (
    <li
      className={`grid shrink-0 grid-cols-[30px_minmax(0,1fr)_auto_22px] items-center gap-2.5 border-b border-l-[6px] border-track px-2.5 py-1.5 motion-safe:animate-deal-in lg:py-2 ${mark === false ? "border-l-red-card" : "border-l-royal"}`}
    >
      <span className="block">
        <ShirtBack kit={kit} />
      </span>
      <span className="min-w-0">
        <span className="block truncate font-display text-lg leading-none uppercase">{name}</span>
        {club && <span className="block truncate text-[11px] text-slate">{club}</span>}
      </span>
      <span className="font-display text-[26px] leading-none tabular-nums">{value}</span>
      <span aria-label={mark === null ? "Kick-off" : mark ? "Right" : "Missed"} className={`text-center font-display text-lg ${mark === false ? "text-red-card" : "text-royal"}`}>
        {mark === null ? "" : mark ? "✓" : "✕"}
      </span>
    </li>
  );
}
