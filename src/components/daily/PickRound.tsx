"use client";

import { useState, useTransition } from "react";
import { beginPart, endPart, submitPick } from "@/app/(site)/daily/actions";
import type { PickAnswered, PickQuestion } from "@/lib/daily/data";
import { FixtureTitle } from "./FixtureTitle";
import { GiveUp, Pitch, RoundHead, Steps, type Step, WhistleCover, type Whistle } from "./InPlay";
import { KitTrail, pathOf, type PathClub } from "./KitTrail";
import { ShirtBack, type Kit } from "./ShirtBack";
import { useRoundClock } from "./useRoundClock";

const RIGHT = ["Ball knowledge.", "Correct. Next one.", "Sharp.", "You know ball.", "Oya, next."];
const WRONG = ["Not that one, chief.", "Who told you that one?", "E no reach.", "Wrong shout."];
/** How long a result stays up before the next question. */
const SHOW_MS = 800;

type Props = {
  /** Half-time or full time when this part ends. */
  whistle: Whistle;
  partLabel: string;
  format: "pick" | "era";
  title: string;
  prompt: string;
  attemptId: number;
  dailyId: number;
  deadlineAt: string;
  serverNow: number;
  /** Whether the clock had started when the page rendered. */
  begun: boolean;
  limitSeconds: number;
  questions: PickQuestion[];
  answered: PickAnswered[];
  /** The fixture's kit for Rapid picks shirts. */
  kit: Kit | null;
  /** Kits of the clubs in career path questions, by club name. */
  pathKits?: Record<string, PathClub>;
};

/** Rapid picks (tap the player) and Era picks (tap the period): one tap a question, against the clock. */
export function PickRound(props: Props) {
  const [answered, setAnswered] = useState(props.answered);
  // The tap waiting on the server, then the result shown before moving on.
  const [tap, setTap] = useState<{ id: number; choice: string; result?: PickAnswered } | null>(null);
  const [closing, startClosing] = useTransition();
  const [, startPick] = useTransition();

  const close = () => startClosing(() => endPart(props.attemptId));
  const { left } = useRoundClock({
    deadlineAt: props.deadlineAt,
    serverNow: props.serverNow,
    begun: props.begun,
    limitSeconds: props.limitSeconds,
    begin: () => beginPart(props.attemptId, props.dailyId),
    onZero: close,
  });
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
      const r = await submitPick(props.attemptId, props.dailyId, q.id, choice);
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

  const steps: Step[] = props.questions.map((q) => {
    const a = answered.find((x) => x.id === q.id);
    return a ? (a.right ? "right" : "wrong") : q === current ? "now" : "next";
  });
  const era = props.format === "era";
  const low = left <= 10 && !over;
  const progress = (
    <Steps steps={steps} label="Your answers so far">
      <span className="text-navy/70">
        {number} of {props.questions.length}
      </span>{" "}
      <span className="font-display text-lg tracking-normal text-royal lg:text-2xl">{right} right</span>
    </Steps>
  );
  const stateOf = (choice: string) => {
    const chosen = tap?.choice === choice;
    const isAnswer = result?.answer === choice;
    return result ? (isAnswer ? "right" : chosen ? "wrong" : "idle") : chosen ? "pending" : "idle";
  };
  const faded = (state: string) => (result && state === "idle" ? "opacity-40" : "");

  return (
    <main className="mx-auto grid w-full max-w-[560px] flex-1 grid-rows-[auto_1fr_auto] px-4 [grid-template-areas:'head'_'squad'_'answer'] lg:max-w-[1184px] lg:grid-cols-[400px_minmax(0,1fr)] lg:grid-rows-[auto_1fr] lg:gap-x-10 lg:[grid-template-areas:'head_squad'_'answer_squad']">
      {closing && <WhistleCover whistle={props.whistle} />}
      <section className="[grid-area:head]">
        <RoundHead
          label={`${props.partLabel} · ${era ? "Era picks" : "Rapid picks"}`}
          title={
            era ? (
              <h1 className="font-display text-[34px] leading-[0.9] whitespace-nowrap uppercase lg:text-5xl xl:text-[50px]">
                Era picks
              </h1>
            ) : (
              <FixtureTitle title={props.title} className="text-[min(34px,var(--fit))] lg:text-[min(64px,var(--fit))]" />
            )
          }
          prompt={props.prompt}
          left={left}
          low={low}
        />
      </section>

      <section className="flex flex-col pt-3 pb-4 [grid-area:squad] lg:block lg:pt-6 lg:pb-10">
        {/* One line for the player: the next name replaces this one in place. */}
        {current && era && <EraQuestion question={current.question} />}
        {/* Any other question on a Rapid picks round (a Golden Boot season), in the same big line. */}
        {current && !era && current.question && !pathOf(current.question) && <EraQuestion question={current.question} />}
        {/* A career path: the player's clubs as a trail of kits, the next path replacing this one in place. */}
        {current && !era && pathOf(current.question) && (
          <KitTrail key={`path-${current.id}`} clubs={pathOf(current.question)!} kits={props.pathKits ?? {}} className="animate-deal-in" />
        )}
        <div className={era || current?.question ? "mt-3 lg:mt-5" : ""}>{progress}</div>

        {current && !era && (
          // Rapid picks: four shirts on the pitch, pick your man. The pitch
          // stays put; only the shirts change from question to question.
          <Pitch half="middle" className="mt-3 aspect-[358/410] lg:mt-5 lg:aspect-[4/3]">
            <div key={`shirts-${current.id}`} className="animate-deal-in absolute inset-0">
              {current.choices.map((choice, i) => {
                const state = stateOf(choice);
                const [x, y] = SPOTS[i] ?? [50, 50];
                return (
                  <button
                    key={choice}
                    type="button"
                    onClick={() => pick(current, choice)}
                    disabled={over || Boolean(tap)}
                    aria-label={choice}
                    className={`group absolute grid w-[30cqw] -translate-1/2 justify-items-center transition-[opacity,scale] duration-200 lg:w-[22cqw] ${faded(state)} ${result && state === "idle" ? "scale-90" : ""}`}
                    style={{ left: `${x}%`, top: `${y}%` }}
                  >
                    <span className="relative w-[26cqw] lg:w-[17cqw]">
                      {state === "right" && (
                        <span aria-hidden className="absolute inset-[-8%] rounded-full border-[1.2cqw] border-royal opacity-0 motion-safe:animate-pick-ring lg:border-[0.8cqw]" />
                      )}
                      <span className={`relative block transition-[translate,scale,filter] duration-150 ${SHIRT_MOVE[state]}`}>
                        <ShirtBack kit={props.kit ?? undefined} num={String.fromCharCode(65 + i)} state={state === "wrong" ? "miss" : "hit"} />
                      </span>
                    </span>
                    <span className={`relative -mt-[0.5cqw] max-w-full truncate px-[2cqw] py-[0.8cqw] font-display text-[5cqw] leading-none uppercase transition-colors lg:text-[3.2cqw] ${PICK_TAG[state]}`}>
                      {tagName(choice)}
                    </span>
                  </button>
                );
              })}
            </div>
          </Pitch>
        )}

        {current && era && (
          // Era picks: four flat season tickets in a two-by-two grid, the A–D
          // stub torn across the top, the years on one line (Collins, 9 Nov
          // 2026, option C of https://claude.ai/artifact/W8WzfBiMFE3F6Lq31H8kec).
          // On phones the four fill the height between the question and the answer bar (Collins, 9 Nov 2026).
          <div
            key={`tickets-${current.id}`}
            className="animate-deal-in mt-4 grid min-h-[230px] flex-1 grid-cols-2 grid-rows-2 gap-2.5 pr-1 lg:mt-6 lg:min-h-0 lg:flex-none lg:grid-rows-none lg:gap-5"
          >
            {current.choices.map((choice, i) => {
              const state = stateOf(choice);
              const [from, to] = choice.split("–");
              return (
                <button
                  key={choice}
                  type="button"
                  onClick={() => pick(current, choice)}
                  disabled={over || Boolean(tap)}
                  className={`grid min-w-0 grid-rows-[auto_1fr] border-[2.5px] bg-white text-left transition-[opacity,translate] enabled:hover:-translate-y-0.5 ${TICKET_TONE[state]} ${faded(state)}`}
                >
                  <span className={`flex items-center justify-between gap-2 border-b-[2.5px] border-dashed px-2 py-1 lg:px-3 ${STUB_TONE[state]}`}>
                    <span className="font-display text-[22px] leading-none lg:text-[30px]">{String.fromCharCode(65 + i)}</span>
                    <span className="label truncate text-[9px] lg:text-[11px]">{STUB_LABEL[state]}</span>
                  </span>
                  <span className="flex items-center px-2 pt-2 pb-2.5 font-display text-[clamp(21px,7.2vw,30px)] leading-none whitespace-nowrap tabular-nums lg:px-3 lg:pt-3 lg:pb-4 lg:text-[44px]">
                    {to !== undefined ? (
                      <>
                        {from} <span className={state === "idle" || state === "pending" ? "text-teal" : ""}>→</span> {to || "now"}
                      </>
                    ) : (
                      choice
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </section>

      <section className="sticky bottom-0 -mx-4 flex items-baseline justify-between gap-3 border-t-2 border-navy bg-white px-4 pt-3 pb-4 [grid-area:answer] lg:static lg:mx-0 lg:self-start lg:border-t-[3px] lg:border-double lg:px-0 lg:pt-5">
        <p
          role="status"
          className={`min-h-[22px] text-sm font-semibold lg:text-[15px] ${result ? (result.right ? "text-royal" : "text-red-card") : low ? "text-red-card" : "text-navy/70"}`}
        >
          {feedback || (low ? "Ten seconds. Trust your gut." : era ? "Tap a ticket. One tap, no swaps." : "Tap a shirt. One tap, no swaps.")}
        </p>
        <GiveUp onClick={close} disabled={over} />
      </section>
    </main>
  );
}

/** "Dennis Bergkamp at Arsenal": the player big, the club after him in royal. */
function EraQuestion({ question }: { question: string | null }) {
  if (!question) return null;
  const club = eraClub(question);
  const name = club ? question.slice(0, question.lastIndexOf(" at ")) : question;
  return (
    <p className="font-display text-[38px] text-balance leading-[0.9] uppercase lg:text-[65px]">
      {name}
      {club && <span className="text-royal"> at {club}</span>}
    </p>
  );
}

function eraClub(question: string | null): string | null {
  const at = question?.lastIndexOf(" at ") ?? -1;
  return question && at > 0 ? question.slice(at + 4) : null;
}

/** The name on a shirt's tag: all but the first name ("Van Persie"), or the one name. */
function tagName(name: string): string {
  const words = name.trim().split(/\s+/);
  return words.length > 1 ? words.slice(1).join(" ") : name;
}

/** Where the four shirts stand on the pitch (x, y in %). */
const SPOTS: [number, number][] = [
  [28, 24],
  [72, 28],
  [28, 72],
  [72, 76],
];

const PICK_TAG = {
  idle: "bg-navy text-white",
  pending: "bg-teal-light text-navy outline-2 outline-navy outline",
  right: "bg-royal text-white outline-[3px] outline-offset-2 outline-royal outline",
  wrong: "bg-red-card text-white",
} as const;

/** The shirt itself: lifts on hover, squashes when pressed, stands up with a
 * hard shadow while the tap is checked, then jumps (right) or shakes (wrong). */
const SHIRT_MOVE = {
  idle: "group-enabled:group-hover:-translate-y-1 group-enabled:group-active:scale-90",
  pending: "-translate-y-[4%] scale-110 drop-shadow-[0.8cqw_1.2cqw_0_var(--color-navy)]",
  right: "scale-110 -translate-y-[4%] drop-shadow-[0.8cqw_1.2cqw_0_var(--color-royal)] motion-safe:animate-pick-win",
  wrong: "motion-safe:animate-pick-shake",
} as const;

const TICKET_TONE = {
  idle: "border-navy text-navy shadow-[4px_4px_0_var(--color-navy)]",
  pending: "border-navy bg-mist! text-navy shadow-[4px_4px_0_var(--color-navy)]",
  right: "border-royal text-royal shadow-[4px_4px_0_var(--color-royal)]",
  wrong: "border-red-card text-red-card shadow-[4px_4px_0_var(--color-red-card)]",
} as const;

const STUB_TONE = {
  idle: "border-navy bg-teal-light text-navy",
  pending: "border-navy bg-teal text-white",
  right: "border-white bg-royal text-white",
  wrong: "border-white bg-red-card text-white",
} as const;

const STUB_LABEL = { idle: "Season ticket", pending: "Season ticket", right: "His spell", wrong: "Your tap" } as const;
