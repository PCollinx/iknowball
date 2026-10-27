"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { beginPart, submitOrder } from "@/app/(site)/daily/actions";
import { RoundClock, Steps, type Step, WhistleCover, type Whistle } from "./InPlay";
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
      {/* The round lives inside the kick-off's sticker. */}
      <section className="relative self-start border-[2.5px] border-navy bg-white shadow-[5px_5px_0_var(--color-navy)]">
        <div className="flex items-center justify-between gap-3 bg-navy px-2.5 py-1.5 text-white lg:px-4 lg:py-2">
          <span className="label text-[10px] text-teal-light lg:text-xs">{props.partLabel} · In Order</span>
          <span className="label text-[10px] lg:text-xs">
            {placed.length} / {total} placed
          </span>
        </div>
        <RoundClock left={left} low={left <= 10 && !over} className="absolute top-7 -right-2 rotate-3 lg:top-9 lg:-right-3" />
        <div className="pt-2.5 pr-[112px] pl-3 lg:pt-4 lg:pr-[170px] lg:pl-5">
          <h1 className="font-display text-[34px] leading-[0.9] uppercase lg:text-[56px]">
            In <span className="sash-mark">order</span>
          </h1>
          <p className="mt-1.5 text-[13px] leading-snug lg:text-base">{props.prompt}</p>
        </div>
        <div className="px-3 pt-3 lg:px-5 lg:pt-4">
          <Steps steps={steps} label="Slots filled" />
        </div>

        <div className="grid gap-4 px-3 pt-3 pb-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-8 lg:px-5 lg:pt-5 lg:pb-6">
          <ol>
            {Array.from({ length: total }, (_, k) => {
              const id = placed[k];
              const next = k === placed.length && !over;
              return (
                <li key={k} className={`mb-1.5 grid h-10 grid-cols-[34px_minmax(0,1fr)] border-2 lg:mb-2 lg:h-12 lg:grid-cols-[44px_minmax(0,1fr)] ${id ? "border-navy" : next ? "border-dashed border-navy" : "border-dashed border-[#9aa6c8]"}`}>
                  <span className="flex items-center justify-center border-r-2 border-navy bg-teal-light font-display text-[22px] lg:text-[28px]">{k + 1}</span>
                  {id ? (
                    <button
                      type="button"
                      disabled={over}
                      onClick={() => setPlaced((p) => p.filter((x) => x !== id))}
                      aria-label={`${byId.get(id)}: send back`}
                      className="flex min-w-0 items-center justify-between gap-2 bg-royal px-2.5 text-left font-display text-[22px] text-white uppercase lg:text-[26px]"
                    >
                      <span className="truncate">{byId.get(id)}</span>
                      {/* When he joined stays a question until full time. */}
                      <span aria-hidden className="text-teal-light">?</span>
                    </button>
                  ) : (
                    <span className="flex items-center px-2.5 text-[13px] font-semibold text-[#7d88aa]">{next ? "Next in goes here" : ""}</span>
                  )}
                </li>
              );
            })}
          </ol>
          <div>
            <span className="label hidden text-xs lg:block">Squad · tap them in the order they joined</span>
            <div className="flex flex-wrap gap-2 lg:mt-3 lg:gap-3">
              {squad.map((item, i) => (
                <button
                  key={item.id}
                  type="button"
                  disabled={over}
                  onClick={() => setPlaced((p) => (p.length < total && !p.includes(item.id) ? [...p, item.id] : p))}
                  className={`border-[2.5px] border-navy bg-white px-3 py-1.5 font-display text-xl uppercase shadow-[3px_3px_0_var(--color-navy)] transition-[translate,box-shadow] enabled:hover:-translate-0.5 enabled:hover:bg-mist enabled:active:translate-0.5 enabled:active:shadow-none lg:text-2xl ${TILT[i % TILT.length]}`}
                >
                  {item.text}
                </button>
              ))}
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

const TILT = ["-rotate-2", "rotate-[1.5deg]", "-rotate-1", "rotate-1", "-rotate-[1.5deg]", "rotate-2"];
