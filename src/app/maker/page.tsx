import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { FORMAT_NAME } from "@/components/daily/formats";
import { shortDate } from "@/components/daily/Masthead";
import { Chip, MAKER_MAIN, MakerBar, MakerHead, type ChipKind } from "@/components/maker/MakerBar";
import { listParts, requireAdmin, type MakerPart } from "@/lib/maker/data";
import { addDays, gameDate, matchweekBounds } from "@/lib/time";

// Days (maker redesign, 31 Oct 2026): the next seven as tiles, then every
// week from last week to four ahead as a table of both parts.

export default function MakerHome() {
  return (
    <Suspense fallback={<main className="min-h-dvh" aria-busy="true" />}>
      <DayList />
    </Suspense>
  );
}

const WEEKS_BACK = 1;
const WEEKS_AHEAD = 4;

type DayState = "live" | "scheduled" | "draft" | "empty" | "past";

function dayState(parts: MakerPart[] | undefined, date: string, today: string): DayState {
  if (!parts?.length) return date < today ? "past" : "empty";
  const scheduled = parts.every((p) => p.status === "scheduled");
  if (scheduled && date === today) return "live";
  return scheduled ? "scheduled" : "draft";
}

const STATE: Record<DayState, { text: string; chip: ChipKind }> = {
  live: { text: "Live", chip: "live" },
  scheduled: { text: "Scheduled", chip: "scheduled" },
  draft: { text: "Draft", chip: "draft" },
  empty: { text: "Empty", chip: "empty" },
  past: { text: "None", chip: "plain" },
};

const dayHref = (date: string) => `/maker/day?date=${date}`;
const plays = (parts?: MakerPart[]) => Math.max(0, ...(parts ?? []).map((p) => p.plays));
const isAuto = (parts?: MakerPart[]) => (parts ?? []).some((p) => p.template !== null && p.status === "draft");

async function DayList() {
  await connection();
  await requireAdmin();
  const today = gameDate();
  const from = addDays(matchweekBounds(today).startsOn, -7 * WEEKS_BACK);
  const to = addDays(from, 7 * (WEEKS_BACK + WEEKS_AHEAD + 1) - 1);
  const days = await listParts(from, to);
  const weeks = Array.from({ length: WEEKS_BACK + WEEKS_AHEAD + 1 }, (_, w) => Array.from({ length: 7 }, (_, d) => addDays(from, w * 7 + d)));
  const next = Array.from({ length: 7 }, (_, i) => addDays(today, i));
  const gaps = next.filter((d) => !["scheduled", "live"].includes(dayState(days.get(d), d, today)));

  return (
    <>
      <MakerBar active="days" />
      <main className={MAKER_MAIN}>
        <MakerHead
          title="Days"
          tools={
            <form action="/maker/day" className="flex border-2 border-navy">
              <label htmlFor="go-date" className="sr-only">
                Open a date
              </label>
              <input id="go-date" type="date" name="date" defaultValue={today} required className="min-w-0 px-2 py-1 font-semibold" />
              <button type="submit" className="border-l-2 border-navy bg-teal-light px-3 font-display text-base uppercase">
                Open
              </button>
            </form>
          }
        >
          Every Daily from last week to four weeks ahead. Drafts come from the 20:00 job; open a day to check it and schedule it.
        </MakerHead>

        <div
          className={`mb-4 flex flex-wrap items-center justify-between gap-2 border-2 px-3 py-2 font-semibold ${gaps.length ? "border-red-card bg-[#fdeef0]" : "border-teal bg-[#e6fbfa]"}`}
        >
          <span>{gaps.length ? `${gaps.length} of the next 7 days ${gaps.length === 1 ? "isn't" : "aren't"} scheduled.` : "The next 7 days are all scheduled."}</span>
          {gaps.length > 0 && (
            <Link href={dayHref(gaps[0])} className="btn-white btn-press px-3 py-1 font-display text-[15px] uppercase">
              Review {shortDate(gaps[0])} →
            </Link>
          )}
        </div>

        <h2 className="font-display text-[22px] leading-none uppercase">The next seven</h2>
        <ol className="mt-2 mb-5 grid auto-cols-[112px] grid-flow-col gap-1.5 overflow-x-auto pb-1 md:auto-cols-auto md:grid-flow-row md:grid-cols-7 md:overflow-visible">
          {next.map((date) => (
            <li key={date} className="min-w-0">
              <Tile date={date} today={today} parts={days.get(date)} />
            </li>
          ))}
        </ol>

        {weeks.map((week) => (
          <section key={week[0]} className="mt-5">
            <div className="mb-1.5 flex justify-between">
              <span className="label">Week of {shortDate(week[0])}</span>
              <span className="label text-slate">Mon to Sun</span>
            </div>
            <div className="overflow-x-auto border-2 border-navy">
              <table className="w-full border-collapse text-[13px]">
                <thead>
                  <tr className="bg-mist text-left text-[10px] tracking-[0.06em] uppercase">
                    <th className="px-2 py-1.5">Day</th>
                    <th className="px-2 py-1.5">Fixture</th>
                    <th className="px-2 py-1.5">Part 1</th>
                    <th className="px-2 py-1.5">Part 2</th>
                    <th className="px-2 py-1.5">State</th>
                    <th className="px-2 py-1.5 text-right">Played</th>
                  </tr>
                </thead>
                <tbody>
                  {week.map((date) => (
                    <DayRow key={date} date={date} today={today} parts={days.get(date)} />
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </main>
    </>
  );
}

function Tile({ date, today, parts }: { date: string; today: string; parts?: MakerPart[] }) {
  const state = dayState(parts, date, today);
  const [weekday, day] = shortDate(date).split(" ");
  const first = parts?.find((p) => p.part === 1);
  return (
    <Link
      href={dayHref(date)}
      className={`flex h-full flex-col gap-1 border-2 px-2 pt-1.5 pb-2 ${
        state === "live"
          ? "border-navy bg-navy text-white shadow-[3px_3px_0_var(--color-teal-light)]"
          : state === "empty"
            ? "border-dashed border-red-card hover:bg-mist"
            : "border-navy hover:bg-mist"
      }`}
    >
      <span className="flex items-baseline justify-between">
        <b className="font-display text-[26px] leading-[0.9]">{day}</b>
        <span className={`label text-[11px] ${state === "live" ? "text-track" : "text-slate"}`}>{weekday}</span>
      </span>
      <span className={`text-[13px] leading-tight font-semibold [overflow-wrap:anywhere] ${state === "empty" ? "text-red-card" : ""}`}>
        {first?.title ?? (state === "empty" ? "Nothing yet" : "No Daily")}
      </span>
      {parts?.length ? (
        <span className={`text-[11px] ${state === "live" ? "text-track" : "text-slate"}`}>{parts.map((p) => FORMAT_NAME[p.format]).join(" · ")}</span>
      ) : null}
      <span className="mt-auto flex flex-wrap gap-1">
        <Chip kind={STATE[state].chip}>{state === "live" && plays(parts) ? `Live · ${plays(parts)} played` : STATE[state].text}</Chip>
        {isAuto(parts) && <Chip kind="auto">Auto</Chip>}
      </span>
    </Link>
  );
}

function DayRow({ date, today, parts }: { date: string; today: string; parts?: MakerPart[] }) {
  const state = dayState(parts, date, today);
  const part = (n: number) => parts?.find((p) => p.part === n);
  const cell = (p?: MakerPart) =>
    p ? (
      <>
        {FORMAT_NAME[p.format]} · {p.answer_count}
        {p.template && <span className="block font-mono text-[11px] text-slate">{p.template}</span>}
      </>
    ) : (
      <span className="text-slate">–</span>
    );
  const tone = date === today ? "bg-[#e6fbfa]" : state === "empty" ? "bg-[#fdeef0]" : date < today ? "text-slate" : "";
  const link = (children: React.ReactNode, className = "") => (
    <Link href={dayHref(date)} className={`block px-2 py-1.5 ${className}`}>
      {children}
    </Link>
  );
  return (
    <tr className={`border-t border-track align-top hover:bg-mist ${tone}`}>
      <td className="whitespace-nowrap">{link(<b className="font-display text-lg">{shortDate(date)}</b>)}</td>
      {parts?.length ? (
        <>
          <td className="min-w-[140px]">{link(part(1)?.title ?? "–")}</td>
          <td className="min-w-[120px]">{link(cell(part(1)))}</td>
          <td className="min-w-[120px]">{link(cell(part(2)))}</td>
        </>
      ) : (
        <td colSpan={3}>{link(state === "empty" ? "Nothing yet. Make it, or the 20:00 job drafts it 8 days ahead." : "No Daily", state === "empty" ? "text-red-card" : "")}</td>
      )}
      <td className="whitespace-nowrap">
        {link(
          <span className="flex flex-wrap gap-1">
            <Chip kind={STATE[state].chip}>{STATE[state].text}</Chip>
            {isAuto(parts) && <Chip kind="auto">Auto</Chip>}
          </span>,
        )}
      </td>
      <td className="text-right tabular-nums">{link(plays(parts) || "–")}</td>
    </tr>
  );
}
