"use client";

import { startTransition, useActionState, useMemo, useState } from "react";
import { saveDay } from "@/app/maker/actions";
import { shortDate } from "@/components/daily/Masthead";
import { ShirtBack, shirtName } from "@/components/daily/ShirtBack";
import { buildKeys, matchAnswer } from "@/lib/daily/match";
import { orderIssues, parseOrder, parsePicks, parseRecall, pickIssues, recallIssues, type Issues } from "@/lib/maker/parse";
import { FORMAT_NAME } from "@/components/daily/formats";
import type { DailyFormat } from "@/lib/daily/score";
import { addDays } from "@/lib/time";
import { Chip, MAKER_MAIN, MakerHead } from "./ui";

export type EditorPart = {
  part: 1 | 2;
  format: DailyFormat;
  title: string;
  prompt: string;
  time: number;
  source: string;
  answers: string;
  plays: number;
  exists: boolean;
  /** The template that drafted it; null for a part written here. */
  template: string | null;
};

type Props = { date: string; today: string; status: "draft" | "scheduled"; parts: EditorPart[] };

export function DayEditor({ date, today, status, parts }: Props) {
  const [state, action, saving] = useActionState(saveDay, null);
  const [recall, setRecall] = useState(parts[0].answers);
  const [order, setOrder] = useState(parts[1].answers);
  const [format1, setFormat1] = useState(parts[0].format);
  const [format2, setFormat2] = useState(parts[1].format);
  const issues1 = useMemo(
    () => (format1 === "pick" ? pickIssues(parsePicks(recall), "pick") : recallIssues(parseRecall(recall))),
    [format1, recall],
  );
  const issues2 = useMemo(
    () =>
      !order.trim() ? { errors: [], warnings: [] } : format2 === "era" ? pickIssues(parsePicks(order), "era") : orderIssues(parseOrder(order)),
    [format2, order],
  );
  const when = date === today ? "Today" : date < today ? "Gone" : null;

  return (
    <main className={MAKER_MAIN}>
      {/* Submitted by hand, not with action=, so a rejected save keeps what was typed. */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          startTransition(() => action(data));
        }}
      >
        <input type="hidden" name="date" value={date} />
        <MakerHead
          crumb={
            <>
              <a href="/maker" className="underline underline-offset-2">
                Days
              </a>{" "}
              / {shortDate(date)}
            </>
          }
          title={
            <>
              {shortDate(date)}
              {parts[0].title && <span className="text-royal"> · {parts[0].title}</span>}
              {when && <span className="ml-2 align-middle text-xl text-teal">{when}</span>}
            </>
          }
          tools={
            <>
              <a href={`/maker/day?date=${addDays(date, -1)}`} className="btn-white btn-press px-3 py-1 font-display text-[15px] uppercase">
                ← {shortDate(addDays(date, -1))}
              </a>
              <a href={`/maker/day?date=${addDays(date, 1)}`} className="btn-white btn-press px-3 py-1 font-display text-[15px] uppercase">
                {shortDate(addDays(date, 1))} →
              </a>
            </>
          }
        >
          Two parts, one try. Part 1 is Free Recall or Rapid picks; Part 2 is In Order or Era picks and can be left blank. A part locks once anyone starts it.
        </MakerHead>

        <PartSection
          part={parts[0]}
          format={format1}
          formats={["free_recall", "pick"]}
          onFormat={setFormat1}
          titleHint="The fixture, e.g. Chelsea v Arsenal"
          answersHint={
            format1 === "pick"
              ? "One question per line, the right option first:\nAshley Cole | Thierry Henry | Frank Lampard | Robert Pires"
              : "One answer per line. Aliases after a bar:\nCesc Fàbregas | Cesc, Fabregas"
          }
          answers={recall}
          onAnswers={setRecall}
          preview={format1 === "pick" ? <PicksPreview source={recall} /> : <RecallPreview source={recall} />}
          issues={issues1}
        />
        <PartSection
          part={parts[1]}
          format={format2}
          formats={["in_order", "era"]}
          onFormat={setFormat2}
          titleHint="Shown on the kick-off page"
          answersHint={
            format2 === "era"
              ? "The player before ::, the right period first:\nThierry Henry at Arsenal :: 1999–2007 | 1995–2003 | 2003–2011 | 2007–2015"
              : "Correct order, top line first. The reveal after a bar:\nEmmanuel Petit | 2001"
          }
          answers={order}
          onAnswers={setOrder}
          preview={format2 === "era" ? <PicksPreview source={order} /> : <OrderPreview source={order} />}
          issues={issues2}
        />

        <div className="sticky bottom-0 z-10 mt-6 grid gap-2.5 bg-navy px-3.5 py-2.5 text-white sm:grid-cols-[1fr_auto] sm:items-center">
          <div aria-live="polite" className="text-sm">
            {state?.ok === false && (
              <ul className="grid gap-1 font-semibold text-[#ff8a98]">
                {state.errors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            )}
            {state?.ok && !saving && <p className="font-semibold text-teal-light">Saved.</p>}
          </div>
          <div className="flex items-stretch gap-3">
            <fieldset className="flex border-2 border-white">
              <legend className="sr-only">Status</legend>
              {(["draft", "scheduled"] as const).map((s) => (
                <label key={s} className="flex cursor-pointer items-center px-2 has-checked:bg-teal-light has-checked:text-navy sm:px-3">
                  <input type="radio" name="status" value={s} defaultChecked={status === s} className="sr-only" />
                  <span className="label">{s === "draft" ? "Draft" : "Scheduled"}</span>
                </label>
              ))}
            </fieldset>
            <button
              type="submit"
              disabled={saving}
              className="btn-teal btn-press flex flex-1 items-center justify-between gap-3 px-3 py-1.5 font-display text-xl whitespace-nowrap uppercase shadow-none! disabled:bg-track disabled:text-navy/60 sm:px-4 sm:text-2xl"
            >
              <span>{saving ? "Saving…" : "Save day"}</span>
              <span aria-hidden="true">→</span>
            </button>
          </div>
        </div>
      </form>
    </main>
  );
}

type SectionProps = {
  part: EditorPart;
  format: DailyFormat;
  formats: [DailyFormat, DailyFormat];
  onFormat: (f: DailyFormat) => void;
  titleHint: string;
  answersHint: string;
  answers: string;
  onAnswers: (v: string) => void;
  preview: React.ReactNode;
  issues: Issues;
};

const input = "w-full border-2 border-navy bg-white px-2 py-1.5 text-sm disabled:border-track disabled:bg-mist";

function PartSection({ part, format, formats, onFormat, titleHint, answersHint, answers, onAnswers, preview, issues }: SectionProps) {
  const locked = part.plays > 0;
  const id = (name: string) => `p${part.part}_${name}`;
  return (
    <section className="grid gap-4 py-3 lg:grid-cols-[minmax(0,1fr)_440px] lg:gap-6">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 bg-navy px-3 py-2 text-white">
          <h2 className="font-display text-[22px] leading-none uppercase">Part {part.part}</h2>
          <span>{FORMAT_NAME[format]}</span>
          {part.template && <Chip kind="auto">Auto</Chip>}
          {part.template && <span className="font-mono text-[11px] text-teal-light">{part.template}</span>}
          {locked && (
            <span className="ml-auto">
              <Chip kind="failed">
                Locked · {part.plays} {part.plays === 1 ? "play" : "plays"}
              </Chip>
            </span>
          )}
        </div>
        <div className="grid content-start gap-3 border-2 border-t-0 border-navy p-3">
          {locked && <p className="text-sm text-slate">Players have started this part, so its answers can&apos;t change.</p>}
          <fieldset className="flex border-2 border-navy" disabled={locked}>
            <legend className="sr-only">Round</legend>
            {formats.map((f) => (
              <label key={f} className="flex flex-1 cursor-pointer justify-center px-3 py-2 has-checked:bg-navy has-checked:text-white">
                <input type="radio" name={id("format")} value={f} checked={format === f} onChange={() => onFormat(f)} className="sr-only" />
                <span className="label">{FORMAT_NAME[f]}</span>
              </label>
            ))}
          </fieldset>
          <label className="grid gap-1">
            <span className="label text-[10px]">Title</span>
            <input name={id("title")} defaultValue={part.title} placeholder={titleHint} maxLength={80} disabled={locked} className={input} />
          </label>
          <label className="grid gap-1.5">
            <span className="label">Prompt</span>
            <textarea
              name={id("prompt")}
              defaultValue={part.prompt}
              rows={2}
              maxLength={280}
              disabled={locked}
              placeholder="What the player is asked"
              className={input}
            />
          </label>
          <div className="grid grid-cols-[140px_1fr] gap-4">
            <label className="grid gap-1.5">
              <span className="label">Seconds</span>
              <input
                name={id("time")}
                type="number"
                min={10}
                max={600}
                step={5}
                defaultValue={part.time}
                disabled={locked}
                className={`${input} font-display text-xl`}
              />
            </label>
            <label className="grid gap-1.5">
              <span className="label">Checked against</span>
              <input
                name={id("source")}
                defaultValue={part.source}
                maxLength={200}
                disabled={locked}
                placeholder="Where you checked the answers"
                className={input}
              />
            </label>
          </div>
          <label className="grid gap-1.5">
            <span className="label">Answers</span>
            <textarea
              name={id("answers")}
              value={answers}
              onChange={(e) => onAnswers(e.target.value)}
              rows={10}
              disabled={locked}
              placeholder={answersHint}
              spellCheck={false}
              className={`${input} font-semibold leading-relaxed`}
            />
          </label>
          {!locked && (issues.errors.length > 0 || issues.warnings.length > 0) && (
            <ul className="grid gap-1 text-[15px]">
              {issues.errors.map((e) => (
                <li key={e} className="font-semibold text-red-card">
                  {e}
                </li>
              ))}
              {issues.warnings.map((w) => (
                <li key={w} className="text-navy/70">
                  {w}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <aside className="grid content-start gap-3 self-start border-2 border-navy bg-mist p-3 lg:sticky lg:top-3">{preview}</aside>
    </section>
  );
}

function RecallPreview({ source }: { source: string }) {
  const answers = useMemo(() => parseRecall(source), [source]);
  const keys = useMemo(() => buildKeys(answers.map((a, id) => ({ id, ...a }))), [answers]);
  const [guess, setGuess] = useState("");
  const hit = guess.trim() ? matchAnswer(guess, keys) : undefined;

  return (
    <>
      <div className="flex justify-between">
        <span className="label">As the player sees it</span>
        <span className="font-display text-2xl">{answers.length}</span>
      </div>
      {answers.length ? (
        <div className="grid grid-cols-5 gap-x-1 gap-y-1.5">
          {answers.map((a, i) => (
            <ShirtBack
              key={`${i}-${a.text}-${hit === i}`}
              name={shirtName(a.text)}
              num={i + 1}
              pop={hit === i}
              className={typeof hit === "number" && hit !== i ? "opacity-25" : ""}
            />
          ))}
        </div>
      ) : (
        <p className="text-navy/60">The shirts show up here as you type.</p>
      )}
      <label className="mt-2 grid gap-1.5">
        <span className="label">Try a guess</span>
        <input
          value={guess}
          onChange={(e) => setGuess(e.target.value)}
          placeholder="Type it like a player would"
          className="border-[3px] border-royal bg-white p-2.5 font-semibold"
        />
      </label>
      <p className={`min-h-[22px] font-semibold ${hit === null ? "text-red-card" : "text-royal"}`}>
        {hit === undefined ? "" : hit === null ? "Wouldn't count." : `Counts for ${answers[hit].text}.`}
      </p>
    </>
  );
}

function OrderPreview({ source }: { source: string }) {
  const answers = useMemo(() => parseOrder(source), [source]);
  return (
    <>
      <span className="label">The reveal, top to bottom</span>
      {answers.length ? (
        <ol>
          {answers.map((a, i) => (
            <li key={`${i}-${a.text}`} className="grid grid-cols-[32px_1fr_auto] items-center gap-2 border-b border-track py-1.5">
              <span className="font-display text-2xl">{i + 1}</span>
              <span className="font-display text-xl uppercase">{a.text}</span>
              <span className="text-sm text-navy/70">{a.note}</span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-navy/60">Leave Part 2 blank for a one-part day.</p>
      )}
    </>
  );
}

function PicksPreview({ source }: { source: string }) {
  const lines = useMemo(() => parsePicks(source), [source]);
  return (
    <>
      <div className="flex justify-between">
        <span className="label">The questions, right option in royal</span>
        <span className="font-display text-2xl">{lines.length}</span>
      </div>
      {lines.length ? (
        <ol className="grid gap-3">
          {lines.map((l, i) => (
            <li key={`${i}-${l.answer}`} className="border-b border-track pb-2">
              <span className="font-display text-xl uppercase">
                {i + 1}. {l.question ?? "Tap the right one"}
              </span>
              <span className="mt-1 flex flex-wrap gap-1.5">
                {[l.answer, ...l.wrong].map((o, k) => (
                  <span key={k} className={`border-2 px-2 py-0.5 text-sm font-semibold ${k ? "border-track bg-white" : "border-royal bg-royal text-white"}`}>
                    {o}
                  </span>
                ))}
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-navy/60">The questions show up here as you type.</p>
      )}
    </>
  );
}
