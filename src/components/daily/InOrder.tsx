"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { beginPart, submitOrder } from "@/app/(site)/daily/actions";
import { RoundHead, Steps, type Step, WhistleCover, type Whistle } from "./InPlay";
import { useRoundClock } from "./useRoundClock";

type Props = {
  /** Half-time or full time when this part ends. */
  whistle: Whistle;
  partLabel: string;
  prompt: string;
  attemptId: number;
  dailyId: number;
  deadlineAt: string;
  serverNow: number;
  /** Whether the clock had started when the page rendered. */
  begun: boolean;
  limitSeconds: number;
  items: { id: number; text: string }[];
};

export function InOrder(props: Props) {
  const [placed, setPlaced] = useState<number[]>([]);
  const [locking, startLock] = useTransition();
  const placedRef = useRef(placed);
  useEffect(() => {
    placedRef.current = placed;
  }, [placed]);

  // When the clock runs out, whatever is placed is locked in.
  const lock = () => startLock(() => submitOrder(props.attemptId, placedRef.current));
  const { left } = useRoundClock({
    deadlineAt: props.deadlineAt,
    serverNow: props.serverNow,
    begun: props.begun,
    limitSeconds: props.limitSeconds,
    begin: () => beginPart(props.attemptId, props.dailyId),
    onZero: lock,
  });
  const over = left === 0 || locking;
  const byId = new Map(props.items.map((i) => [i.id, i.text]));
  const total = props.items.length;

  const steps: Step[] = Array.from({ length: total }, (_, k) => (k < placed.length ? "right" : k === placed.length && !over ? "now" : "next"));
  const squad = props.items.filter((item) => !placed.includes(item.id));
  const ready = placed.length === total && !over;

  return (
    <main className="mx-auto grid w-full max-w-[560px] flex-1 grid-rows-[1fr_auto] px-4 pt-4 lg:max-w-[1000px] lg:grid-rows-[auto_auto] lg:content-start lg:pt-8 lg:pb-10">
      {locking && <WhistleCover whistle={props.whistle} />}
      {/* The order is a team sheet (Collins, 9 Nov 2026, option A of
          https://claude.ai/artifact/W8WzfBiMFE3F6Lq31H8kec): numbered rows,
          the next one lit teal, the squad as flat name tags under it. */}
      <section className="flex flex-col lg:block lg:self-start">
        <RoundHead
          label={`${props.partLabel} · In Order`}
          title={
            <h1 className="font-display text-[34px] leading-[0.9] uppercase lg:text-[56px]">
              In <span className="sash-mark">order</span>
            </h1>
          }
          prompt={props.prompt}
          left={left}
          low={left <= 10 && !over}
        />
        <div className="pt-3 lg:pt-5">
          <Steps steps={steps} label="Slots filled" />
        </div>

        {/* On phones the sheet's rows stretch to fill the screen down to the squad (Collins, 9 Nov 2026). */}
        <div className="flex flex-1 flex-col gap-4 pt-3 pb-4 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-8 lg:pt-5 lg:pb-6">
          <section aria-label="Your order" className="flex flex-1 flex-col border-[3px] border-navy bg-white lg:block">
            <div className="flex items-center justify-between gap-3 border-b-[3px] border-navy bg-mist px-2.5 py-1.5">
              <h2 className="label text-[10px] lg:text-[11px]">Your order · earliest first</h2>
              <span className="label text-[10px] text-teal lg:text-[11px]">
                {placed.length} of {total}
              </span>
            </div>
            <ol className="flex flex-1 flex-col lg:block">
              {Array.from({ length: total }, (_, k) => {
                const id = placed[k];
                const next = k === placed.length && !over;
                return (
                  <li
                    key={k}
                    className={`grid min-h-11 flex-1 grid-cols-[40px_minmax(0,1fr)] border-b border-l-[6px] border-navy last:border-b-0 lg:h-12 lg:min-h-0 lg:grid-cols-[48px_minmax(0,1fr)] ${
                      id ? "border-l-royal" : next ? "border-l-teal bg-mist" : "border-l-track"
                    }`}
                  >
                    <span className={`flex items-center justify-center font-display text-2xl lg:text-[28px] ${id ? "text-royal" : next ? "text-teal" : "text-track"}`}>{k + 1}</span>
                    {id ? (
                      <button
                        type="button"
                        disabled={over}
                        onClick={() => setPlaced((p) => p.filter((x) => x !== id))}
                        aria-label={`${byId.get(id)}: send back`}
                        className="flex min-w-0 items-center justify-between gap-2 pr-3 text-left font-display text-[22px] uppercase enabled:hover:bg-mist lg:text-[26px]"
                      >
                        <span className="truncate">{byId.get(id)}</span>
                        {/* When he joined stays a question until full time. */}
                        <span aria-hidden className="text-teal">?</span>
                      </button>
                    ) : (
                      <span className={`flex items-center text-sm font-semibold ${next ? "text-teal" : "text-track"}`}>{next ? "Tap who's next" : "–"}</span>
                    )}
                  </li>
                );
              })}
            </ol>
          </section>
          <div>
            <span className="label text-[10px] lg:text-xs">{squad.length ? "Still to place" : "All placed"}</span>
            <div className="mt-2 flex flex-wrap gap-2 lg:mt-3 lg:gap-3">
              {/* Every name keeps its place, a placed one left as a dashed gap, so the box never
                  changes size as it empties (Collins, 9 Nov 2026). */}
              {props.items.map((item) =>
                placed.includes(item.id) ? (
                  <span
                    key={item.id}
                    aria-hidden="true"
                    className="border-[2.5px] border-dashed border-track px-3 py-1.5 font-display text-xl text-transparent uppercase select-none lg:text-2xl"
                  >
                    {item.text}
                  </span>
                ) : (
                  <button
                    key={item.id}
                    type="button"
                    disabled={over}
                    onClick={() => setPlaced((p) => (p.length < total && !p.includes(item.id) ? [...p, item.id] : p))}
                    className="border-[2.5px] border-navy bg-white px-3 py-1.5 font-display text-xl uppercase shadow-[3px_3px_0_var(--color-navy)] transition-[translate,box-shadow] enabled:hover:-translate-0.5 enabled:hover:bg-mist enabled:active:translate-0.5 enabled:active:shadow-none lg:text-2xl"
                  >
                    {item.text}
                  </button>
                ),
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="sticky bottom-0 -mx-4 mt-4 grid gap-2 bg-white px-4 pt-3 pb-4 lg:static lg:mx-0 lg:mt-6 lg:max-w-[480px] lg:px-0">
        <button
          type="button"
          onClick={lock}
          disabled={!ready}
          className="btn-teal btn-press p-3 font-display text-2xl uppercase disabled:border-track disabled:bg-track disabled:text-navy/60 disabled:shadow-none"
        >
          {locking ? "Locking in…" : placed.length < total ? `Lock it in · ${placed.length} of ${total} placed` : "Lock it in"}
        </button>
        <p role="status" className="min-h-[22px] text-sm font-semibold text-navy/70">
          {over && !locking ? "Full time on this part." : placed.length ? "Tap a placed name to send it back." : "Fill all the slots, then lock it in."}
        </p>
      </section>
    </main>
  );
}

