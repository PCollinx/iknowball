"use client";

import { useState, useTransition } from "react";
import { endPart, submitPick } from "@/app/daily/actions";
import type { PickAnswered, PickQuestion } from "@/lib/daily/data";
import { FixtureTitle } from "./FixtureTitle";
import { Masthead } from "./Masthead";
import { ShirtBack, shirtName, type Kit } from "./ShirtBack";
import { clock } from "./clock";
import { useCountdown } from "./useCountdown";

const RIGHT = ["Ball knowledge.", "Correct. Next one.", "Sharp.", "You know ball.", "Oya, next."];
const WRONG = ["Not that one, chief.", "Who told you that one?", "E no reach.", "Wrong shout."];
/** How long a result stays up before the next question. */
const SHOW_MS = 800;

type Props = {
  issue: number;
  dateLabel: string;
  partLabel: string;
  format: "pick" | "era";
  title: string;
  prompt: string;
  attemptId: number;
  deadlineAt: string;
  serverNow: number;
  questions: PickQuestion[];
  answered: PickAnswered[];
  /** The fixture's kit for Rapid picks shirts. */
  kit: Kit | null;
};

/** Rapid picks (tap the player) and Era picks (tap the period): one tap a question, against the clock. */
export function PickRound(props: Props) {
  const [answered, setAnswered] = useState(props.answered);
  // The tap waiting on the server, then the result shown before moving on.
  const [tap, setTap] = useState<{ id: number; choice: string; result?: PickAnswered } | null>(null);
  const [closing, startClosing] = useTransition();
  const [, startPick] = useTransition();

  const close = () => startClosing(() => endPart(props.attemptId));
  const left = useCountdown(props.deadlineAt, props.serverNow, close);
  const over = left === 0 || closing;

  const done = new Set(answered.map((a) => a.id));
  // The question on screen: the one just tapped while its result shows, else the next unanswered.
  const current = tap ? props.questions.find((q) => q.id === tap.id) : props.questions.find((q) => !done.has(q.id));
  const number = current ? props.questions.indexOf(current) + 1 : props.questions.length;
  const right = answered.filter((a) => a.right).length;

  function pick(q: PickQuestion, choice: string) {
    if (tap || over) return;
    setTap({ id: q.id, choice });
    startPick(async () => {
      const r = await submitPick(props.attemptId, q.id, choice);
      if (r.status === "closed") return close();
      const result = { id: q.id, choice, answer: r.answer, right: r.right };
      setTap({ id: q.id, choice, result });
      await new Promise((ok) => setTimeout(ok, SHOW_MS));
      setAnswered((a) => (a.some((x) => x.id === q.id) ? a : [...a, result]));
      setTap(null);
      if (r.done) close();
    });
  }

  const result = tap?.result;
  const feedback = over
    ? "Full time on this part."
    : result
      ? result.right
        ? RIGHT[right % RIGHT.length]
        : `${WRONG[number % WRONG.length]} It was ${result.answer}.`
      : tap
        ? "Checking…"
        : "";

  return (
    <main className="mx-auto grid min-h-dvh max-w-[1200px] grid-rows-[auto_1fr_auto] [grid-template-areas:'head'_'squad'_'answer'] lg:h-dvh lg:grid-cols-[440px_1fr] lg:grid-rows-[1fr_auto] lg:[grid-template-areas:'head_squad'_'answer_squad']">
      <section className="px-4 [grid-area:head] lg:px-8">
        <Masthead issue={props.issue} right={`${props.dateLabel} · ${props.partLabel}`} />
        <div className="grid grid-cols-[1fr_auto] items-start gap-3 border-b-[3px] border-double border-navy py-3.5 lg:grid-cols-1 lg:border-b-0">
          <div className="@container min-w-0">
            {props.format === "era" ? (
              <h1 className="font-display text-[52px] leading-[0.9] uppercase lg:text-[80px]">
                Era <span className="text-royal">picks</span>
              </h1>
            ) : (
              <FixtureTitle title={props.title} className="text-[min(52px,var(--fit))] lg:text-[min(80px,var(--fit))]" />
            )}
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

      <section className="px-4 [grid-area:squad] lg:overflow-y-auto lg:border-l-[3px] lg:border-double lg:border-navy lg:px-8">
        {/* The scoreline so far: a box a question, right in royal, wrong in red. */}
        <div className="flex items-baseline justify-between gap-3 pt-3 pb-2">
          <span className="label">
            Question {number} of {props.questions.length}
          </span>
          <span className="font-display text-3xl lg:text-5xl">{right} right</span>
        </div>
        <ol className="flex gap-1 pb-4" aria-label="Your answers so far">
          {props.questions.map((q, i) => {
            const a = answered.find((x) => x.id === q.id);
            const tone = a ? (a.right ? "bg-royal border-royal" : "bg-red-card border-red-card") : q === current ? "border-navy" : "border-track";
            return <li key={q.id} aria-label={`Question ${i + 1}: ${a ? (a.right ? "right" : "wrong") : "to come"}`} className={`h-3 flex-1 border-2 ${tone}`} />;
          })}
        </ol>

        {current && (
          <div key={current.id} className="animate-deal-in pb-6">
            {current.question && <p className="mb-3 font-display text-[40px] leading-[0.95] uppercase lg:text-6xl">{current.question}</p>}
            <div className="grid grid-cols-2 gap-2 lg:gap-4">
              {current.choices.map((choice, i) => {
                const chosen = tap?.choice === choice;
                const isAnswer = result?.answer === choice;
                const state = result ? (isAnswer ? "right" : chosen ? "wrong" : "idle") : chosen ? "pending" : "idle";
                return props.format === "pick" ? (
                  <button
                    key={choice}
                    type="button"
                    onClick={() => pick(current, choice)}
                    disabled={over || Boolean(tap)}
                    className={`grid justify-items-center gap-1 border-[3px] p-2 text-center transition-colors ${PICK_TONE[state]} ${result && state === "idle" ? "opacity-40" : ""}`}
                  >
                    <span className="w-full max-w-[120px]">
                      <ShirtBack
                        kit={props.kit ?? undefined}
                        name={shirtName(choice)}
                        num={String.fromCharCode(65 + i)}
                        state={state === "wrong" ? "miss" : "hit"}
                      />
                    </span>
                    <span className="text-[15px] leading-tight font-semibold">{choice}</span>
                  </button>
                ) : (
                  <button
                    key={choice}
                    type="button"
                    onClick={() => pick(current, choice)}
                    disabled={over || Boolean(tap)}
                    className={`border-[3px] px-2 py-5 font-display text-[34px] leading-none tabular-nums transition-colors lg:py-8 lg:text-5xl ${ERA_TONE[state]} ${result && state === "idle" ? "opacity-40" : ""}`}
                  >
                    {choice}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </section>

      <section className="sticky bottom-0 grid gap-2 border-t-2 border-navy bg-white px-4 pt-3 pb-4 [grid-area:answer] lg:static lg:mx-8 lg:border-t-[3px] lg:border-double lg:px-0">
        <p
          role="status"
          className={`min-h-[22px] text-[15px] font-semibold ${result ? (result.right ? "text-royal" : "text-red-card") : "text-navy/70"}`}
        >
          {feedback}
        </p>
        <div>
          <button type="button" onClick={close} disabled={over} className="text-[13px] font-semibold text-navy/70 underline underline-offset-[3px]">
            Give up and reveal
          </button>
        </div>
      </section>
    </main>
  );
}

const PICK_TONE = {
  idle: "border-navy bg-white hover:bg-mist",
  pending: "border-navy bg-mist",
  right: "border-royal bg-mist",
  wrong: "border-red-card bg-white",
} as const;

const ERA_TONE = {
  idle: "border-navy bg-white text-navy hover:bg-mist",
  pending: "border-navy bg-navy text-white",
  right: "border-royal bg-royal text-white",
  wrong: "border-red-card bg-red-card text-white",
} as const;
