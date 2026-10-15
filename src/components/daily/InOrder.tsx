"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { submitOrder } from "@/app/daily/actions";
import { Masthead } from "./Masthead";
import { ShirtBack, shirtName } from "./ShirtBack";
import { useCountdown } from "./useCountdown";
import { clock } from "./clock";

type Props = {
  issue: number;
  dateLabel: string;
  partLabel: string;
  prompt: string;
  attemptId: number;
  deadlineAt: string;
  serverNow: number;
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
  const left = useCountdown(props.deadlineAt, props.serverNow, lock);
  const over = left === 0 || locking;
  const byId = new Map(props.items.map((i) => [i.id, i.text]));
  const total = props.items.length;

  return (
    <main className="mx-auto grid min-h-dvh max-w-[1200px] grid-rows-[auto_1fr_auto] [grid-template-areas:'head'_'squad'_'answer'] lg:h-dvh lg:grid-cols-[440px_1fr] lg:grid-rows-[1fr_auto] lg:[grid-template-areas:'head_squad'_'answer_squad']">
      <section className="px-4 [grid-area:head] lg:px-8">
        <Masthead issue={props.issue} right={`${props.dateLabel} · ${props.partLabel}`} />
        <div className="grid grid-cols-[1fr_auto] items-start gap-3 border-b-[3px] border-double border-navy py-3.5 lg:grid-cols-1 lg:border-b-0">
          <div>
            <h1 className="font-display text-[52px] leading-[0.9] uppercase lg:text-[80px]">
              In <span className="text-royal">order</span>
            </h1>
            <p className="mt-2 max-w-[32ch] text-[15px] lg:text-lg">{props.prompt}</p>
          </div>
          <div
            className={`min-w-[92px] px-2.5 pt-1.5 pb-2 text-right text-white lg:flex lg:items-baseline lg:gap-3.5 lg:justify-self-start lg:px-4 ${left <= 10 && !over ? "bg-red-card" : "bg-teal"}`}
            role="timer"
            aria-label={`${left} seconds left`}
          >
            <span className="label block text-[10px] lg:order-2 lg:text-xs">Time left</span>
            <span className="block font-display text-[46px] leading-[0.9] tabular-nums lg:text-7xl">{clock(left)}</span>
          </div>
        </div>
      </section>

      <section className="px-4 [grid-area:squad] lg:overflow-y-auto lg:border-l-[3px] lg:border-double lg:border-navy lg:px-8 lg:pt-3.5">
        <ol className="pt-2">
          {Array.from({ length: total }, (_, k) => {
            const id = placed[k];
            const next = k === placed.length && !over;
            return (
              <li key={k} className="grid min-h-[54px] grid-cols-[40px_1fr] items-center gap-2.5 border-b border-track">
                <span className={`font-display text-[34px] ${id ? "text-navy" : "text-track"}`}>{k + 1}</span>
                {id ? (
                  <button
                    type="button"
                    disabled={over}
                    onClick={() => setPlaced((p) => p.filter((x) => x !== id))}
                    aria-label={`Send ${byId.get(id)} back`}
                    className="h-[38px] bg-royal px-2.5 text-left font-display text-2xl text-white uppercase"
                  >
                    {byId.get(id)}
                  </button>
                ) : (
                  <span className="flex h-[38px] items-center border-2 border-dashed border-track px-2.5 text-sm text-[#7d88aa]">
                    {next ? "Tap a player below" : ""}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
        <div className="flex justify-between pt-4 pb-2">
          <span className="label">Squad</span>
          <span className="label text-navy/70">{total} players</span>
        </div>
        <div className="grid grid-cols-3 gap-2 pb-4 lg:grid-cols-6">
          {props.items.map((item) => (
            <button
              key={item.id}
              type="button"
              disabled={over || placed.includes(item.id)}
              onClick={() => setPlaced((p) => (p.length < total && !p.includes(item.id) ? [...p, item.id] : p))}
              className="grid justify-items-center gap-0.5 border-2 border-navy bg-white px-1.5 pt-2 pb-1.5 enabled:hover:border-royal enabled:hover:bg-mist disabled:opacity-25"
            >
              <span className="w-14">
                <ShirtBack name={shirtName(item.text)} state="miss" className="[&_path]:stroke-navy" />
              </span>
              <span className="label text-[11px]">{item.text.split(" ")[0]}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="sticky bottom-0 grid gap-2 border-t-2 border-navy bg-white px-4 pt-3 pb-4 [grid-area:answer] lg:static lg:mx-8 lg:border-t-[3px] lg:border-double lg:px-0">
        <button
          type="button"
          onClick={lock}
          disabled={over || placed.length < total}
          className="bg-royal p-3 font-display text-2xl text-white uppercase disabled:bg-track disabled:text-navy/60"
        >
          {locking ? "Locking in…" : "Lock it in"}
        </button>
        <p role="status" className="min-h-[22px] text-[15px] font-semibold text-navy/70">
          {placed.length ? "Tap a placed name to send it back." : "Fill all the slots, then lock it in."}
        </p>
      </section>
    </main>
  );
}
