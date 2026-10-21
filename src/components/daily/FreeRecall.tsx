"use client";

import { useRef, useState, useTransition } from "react";
import { endPart, submitGuess } from "@/app/(site)/daily/actions";
import { FixtureTitle } from "./FixtureTitle";
import { GiveUp, Pitch, RoundHead, WhistleCover, type Whistle } from "./InPlay";
import { ShirtBack, shirtName, type Kit } from "./ShirtBack";
import { lineup } from "./lineup";
import { useCountdown } from "./useCountdown";
import type { Found } from "@/lib/daily/data";

const RIGHT = ["Ball knowledge.", "Correct. Next one.", "Sharp. Keep going.", "You know ball.", "Oya, next."];
const WRONG = ["Not on the list. Try again.", "Not on the list, chief.", "Who told you that one?", "E no dey the list."];

type Props = {
  /** Half-time or full time when this part ends. */
  whistle: Whistle;
  partLabel: string;
  title: string;
  prompt: string;
  answerCount: number;
  attemptId: number;
  deadlineAt: string;
  serverNow: number;
  found: Found[];
  /** The fixture's kit for the answer shirts. */
  kit: Kit | null;
};

type Feedback = { text: string; tone: "ok" | "no" | "dup" } | null;

export function FreeRecall(props: Props) {
  const [found, setFound] = useState(props.found);
  const [fresh, setFresh] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [closing, startClosing] = useTransition();
  const [checking, startGuess] = useTransition();
  const [pending, setPending] = useState("");
  const input = useRef<HTMLInputElement>(null);

  const close = () => startClosing(() => endPart(props.attemptId));
  const left = useCountdown(props.deadlineAt, props.serverNow, close);

  function guess(formData: FormData) {
    const value = String(formData.get("guess") ?? "").trim();
    if (!value || closing) return;
    input.current?.focus();
    // Say at once what's being checked, so the box never looks stuck.
    setPending(value);
    startGuess(async () => {
      const r = await submitGuess(props.attemptId, value);
      if (r.status === "correct") {
        setFound((f) => (f.some((x) => x.id === r.id) ? f : [...f, { id: r.id, text: r.text, position: r.position }]));
        setFresh(r.id);
        setFeedback({ text: `${r.text}. ${RIGHT[r.found % RIGHT.length]}`, tone: "ok" });
        if (r.done) close();
      } else if (r.status === "duplicate") {
        setFeedback({ text: `You've already got ${shirtName(r.text)}.`, tone: "dup" });
      } else if (r.status === "wrong") {
        setFeedback({ text: WRONG[Math.floor(Math.random() * WRONG.length)], tone: "no" });
      } else {
        close();
      }
    });
  }

  const over = left === 0 || closing;
  const team = lineup(found, props.answerCount);

  return (
    <main className="mx-auto grid w-full max-w-[560px] flex-1 grid-rows-[auto_1fr_auto] px-4 [grid-template-areas:'head'_'squad'_'answer'] lg:max-w-[1184px] lg:grid-cols-[400px_minmax(0,1fr)] lg:grid-rows-[auto_1fr] lg:gap-x-10 lg:[grid-template-areas:'head_squad'_'answer_squad']">
      {closing && <WhistleCover whistle={props.whistle} />}
      <section className="[grid-area:head]">
        <RoundHead
          label={`${props.partLabel} · Free Recall`}
          title={<FixtureTitle title={props.title} className="text-[min(34px,var(--fit))] lg:text-[min(64px,var(--fit))]" />}
          prompt={team.fullXI && props.answerCount > team.pitch.length ? `${props.prompt} Fill the XI, then the bench.` : props.prompt}
          left={left}
          low={left <= 15 && !over}
        />
      </section>

      {/* The squad: found players line up by position in a 4-4-2; a second
          keeper, or anyone whose line is full, goes to the bench. */}
      <section className="pt-3 pb-4 [grid-area:squad] lg:pt-6 lg:pb-10" aria-label={`Squad: ${found.length} of ${props.answerCount} found`}>
        <Pitch half="attack" className="aspect-[358/336] lg:aspect-[4/3]">
          {team.pitch.map((spot) => {
            const f = spot.player;
            return (
              <div key={`${spot.x}-${spot.y}`} className="absolute w-[15cqw] -translate-1/2 text-center lg:w-[11.5cqw]" style={{ left: `${spot.x}%`, top: `${spot.y}%` }}>
                {f ? (
                  <ShirtBack kit={props.kit ?? undefined} num={f.num} pop={f.id === fresh} />
                ) : (
                  <ShirtBack num="?" state="empty" />
                )}
                {f && (
                  <span className="mt-[-0.5cqw] inline-block max-w-[19cqw] truncate bg-navy px-[1cqw] py-[0.4cqw] font-display text-[3.3cqw] leading-none text-white uppercase lg:text-[2.5cqw]">
                    {shirtName(f.text)}
                  </span>
                )}
              </div>
            );
          })}
        </Pitch>
        {team.bench.length > 0 && (
          <div className="mt-2.5 grid grid-cols-[auto_minmax(0,1fr)] items-start gap-2.5">
            <span className="label pt-1 text-[10px] lg:text-xs">{team.fullXI ? "Bench" : "To find"}</span>
            <div className="grid grid-cols-6 gap-x-1 gap-y-1 lg:grid-cols-8 lg:gap-x-2">
              {team.bench.map((f, j) =>
                f ? (
                  <ShirtBack key={f.id} kit={props.kit ?? undefined} name={shirtName(f.text)} num={f.num} pop={f.id === fresh} />
                ) : (
                  <ShirtBack key={`empty-${j}`} num="?" state="empty" />
                ),
              )}
            </div>
          </div>
        )}
      </section>

      <section className="sticky bottom-0 -mx-4 grid gap-2 border-t-2 border-navy bg-white px-4 pt-3 pb-4 [grid-area:answer] lg:static lg:mx-0 lg:self-start lg:border-t-[3px] lg:border-double lg:px-0 lg:pt-5">
        <form action={guess} autoComplete="off" className="flex gap-2">
          <label htmlFor="guess" className="sr-only">
            Type a player&apos;s name
          </label>
          <input
            ref={input}
            id="guess"
            name="guess"
            autoFocus
            maxLength={60}
            disabled={over}
            placeholder="Type a player's name"
            autoCapitalize="words"
            spellCheck={false}
            enterKeyHint="go"
            className="min-w-0 flex-1 border-[2.5px] border-royal bg-white p-2.5 text-lg font-semibold outline-none placeholder:font-normal placeholder:text-[#7d88aa] focus:shadow-[0_0_0_3px_var(--color-track)]"
          />
          <button
            type="submit"
            disabled={over}
            className="btn-teal btn-press px-4 font-display text-2xl uppercase disabled:border-track disabled:bg-track disabled:text-navy/60 disabled:shadow-none"
          >
            Go
          </button>
        </form>
        <div className="flex items-baseline justify-between gap-3">
          <p
            role="status"
            className={`min-h-[22px] text-sm font-semibold lg:text-[15px] ${feedback?.tone === "ok" ? "text-royal" : feedback?.tone === "no" ? "text-red-card" : "text-navy/70"}`}
          >
            {over ? "Full time on this part." : checking ? `Checking ${pending}…` : feedback?.text}
          </p>
          <GiveUp onClick={close} disabled={over} />
        </div>
      </section>
    </main>
  );
}
