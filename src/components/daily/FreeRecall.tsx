"use client";

import { useRef, useState, useTransition } from "react";
import { endPart, submitGuess } from "@/app/(site)/daily/actions";
import { Masthead } from "./Masthead";
import { ShirtBack, shirtName, type Kit } from "./ShirtBack";
import { useCountdown } from "./useCountdown";
import { clock } from "./clock";
import { FixtureTitle } from "./FixtureTitle";

const RIGHT = ["Ball knowledge.", "Correct. Next one.", "Sharp. Keep going.", "You know ball.", "Oya, next."];
const WRONG = ["Not on the list. Try again.", "Not on the list, chief.", "Who told you that one?", "E no dey the list."];

type Props = {
  issue: number;
  dateLabel: string;
  partLabel: string;
  title: string;
  prompt: string;
  answerCount: number;
  attemptId: number;
  deadlineAt: string;
  serverNow: number;
  found: { id: number; text: string }[];
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
        setFound((f) => (f.some((x) => x.id === r.id) ? f : [...f, { id: r.id, text: r.text }]));
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

  return (
    <main className="mx-auto grid w-full flex-1 max-w-[1200px] grid-rows-[auto_1fr_auto] [grid-template-areas:'head'_'squad'_'answer'] lg:h-dvh lg:grid-cols-[440px_1fr] lg:grid-rows-[1fr_auto] lg:[grid-template-areas:'head_squad'_'answer_squad']">
      <section className="px-4 [grid-area:head] lg:px-8">
        <Masthead issue={props.issue} right={`${props.dateLabel} · ${props.partLabel}`} />
        <div className="grid grid-cols-[1fr_auto] items-start gap-3 border-b-[3px] border-double border-navy py-3.5 lg:grid-cols-1 lg:border-b-0">
          <div className="@container min-w-0">
            <FixtureTitle title={props.title} className="text-[min(52px,var(--fit))] lg:text-[min(80px,var(--fit))]" />
            <p className="mt-2 max-w-[32ch] text-[15px] lg:text-lg">{props.prompt}</p>
          </div>
          <div
            className={`min-w-[92px] px-2.5 pt-1.5 pb-2 text-right text-white lg:flex lg:items-baseline lg:gap-3.5 lg:justify-self-start lg:px-4 ${left <= 15 && !over ? "bg-red-card" : "bg-teal"}`}
            role="timer"
            aria-label={`${left} seconds left`}
          >
            <span className="label block text-[10px] lg:order-2 lg:text-xs">Time left</span>
            <span className="block font-display text-[46px] leading-[0.9] tabular-nums lg:text-7xl">{clock(left)}</span>
          </div>
        </div>
      </section>

      <section className="px-4 [grid-area:squad] lg:overflow-y-auto lg:border-l-[3px] lg:border-double lg:border-navy lg:px-8">
        <div className="hidden lg:block">
          <div className="flex justify-between border-b border-navy pt-3.5 pb-2">
            <span className="label">Squad</span>
            <span className="label">Numbered in the order you got them</span>
          </div>
        </div>
        <div className="flex items-baseline justify-between pt-3 pb-1.5">
          <span className="label">{found.length ? "Found" : "Squad"}</span>
          <span className="font-display text-3xl lg:text-5xl">
            {found.length} / {props.answerCount}
          </span>
        </div>
        <div className="grid grid-cols-5 gap-x-1 gap-y-1.5 pb-4 lg:grid-cols-6 lg:gap-x-3 lg:gap-y-3.5">
          {Array.from({ length: props.answerCount }, (_, k) =>
            k < found.length ? (
              <ShirtBack key={found[k].id} kit={props.kit ?? undefined} name={shirtName(found[k].text)} num={k + 1} pop={found[k].id === fresh} />
            ) : (
              <ShirtBack key={`empty-${k}`} num="?" state="empty" />
            ),
          )}
        </div>
      </section>

      <section className="sticky bottom-0 grid gap-2 border-t-2 border-navy bg-white px-4 pt-3 pb-4 [grid-area:answer] lg:static lg:mx-8 lg:border-t-[3px] lg:border-double lg:px-0">
        <form action={guess} autoComplete="off" className="flex border-[3px] border-royal focus-within:shadow-[0_0_0_3px_var(--color-track)]">
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
            className="min-w-0 flex-1 bg-white p-3 text-lg font-semibold outline-none placeholder:font-normal placeholder:text-[#7d88aa]"
          />
          <button type="submit" disabled={over} className="bg-royal px-5 font-display text-2xl text-white uppercase disabled:bg-track disabled:text-navy/60">
            Go
          </button>
        </form>
        <p
          role="status"
          className={`min-h-[22px] text-[15px] font-semibold ${feedback?.tone === "ok" ? "text-royal" : feedback?.tone === "no" ? "text-red-card" : "text-navy/70"}`}
        >
          {over ? "Full time on this part." : checking ? `Checking ${pending}…` : feedback?.text}
        </p>
        <div>
          <button
            type="button"
            onClick={close}
            disabled={over}
            className="text-[13px] font-semibold text-navy/70 underline underline-offset-[3px]"
          >
            Give up and reveal
          </button>
        </div>
      </section>
    </main>
  );
}

