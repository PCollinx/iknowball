import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { shortDate } from "@/components/daily/Masthead";
import { MakerBar } from "@/components/maker/MakerBar";
import { listParts, requireAdmin, type MakerPart } from "@/lib/maker/data";
import { addDays, gameDate, matchweekBounds } from "@/lib/time";

export default function MakerHome() {
  return (
    <Suspense fallback={<main className="mx-auto min-h-dvh max-w-[1000px] px-4" aria-busy="true" />}>
      <DayList />
    </Suspense>
  );
}

const WEEKS_BACK = 1;
const WEEKS_AHEAD = 4;

async function DayList() {
  await connection();
  await requireAdmin();
  const today = gameDate();
  const from = addDays(matchweekBounds(today).startsOn, -7 * WEEKS_BACK);
  const to = addDays(from, 7 * (WEEKS_BACK + WEEKS_AHEAD + 1) - 1);
  const days = await listParts(from, to);
  const weeks = Array.from({ length: WEEKS_BACK + WEEKS_AHEAD + 1 }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => addDays(from, w * 7 + d)),
  );
  const gaps = weeks.flat().filter((d) => d >= today && d <= addDays(today, 6) && !["scheduled", "live"].includes(dayState(days.get(d), d, today)));

  return (
    <main className="mx-auto min-h-dvh max-w-[1000px] px-4 pb-12 lg:px-8">
      <MakerBar right={<span className="label hidden sm:inline">{shortDate(today)}</span>} />
      <div className="grid gap-4 border-b-[3px] border-double border-navy py-4 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <h1 className="font-display text-[56px] leading-[0.9] uppercase lg:text-[88px]">
            Fixture <span className="text-royal">list</span>
          </h1>
          <p className="mt-2 text-lg">
            {gaps.length ? (
              <span className="font-semibold text-red-card">
                {gaps.length} of the next 7 days {gaps.length === 1 ? "isn't" : "aren't"} scheduled yet.
              </span>
            ) : (
              "The next 7 days are all scheduled."
            )}
          </p>
        </div>
        <form action="/maker/day" className="flex border-[3px] border-royal">
          <label htmlFor="go-date" className="sr-only">
            Open a date
          </label>
          <input id="go-date" type="date" name="date" defaultValue={today} required className="min-w-0 flex-1 p-2.5 font-semibold" />
          <button type="submit" className="bg-royal px-4 font-display text-xl text-white uppercase">
            Open
          </button>
        </form>
      </div>

      {weeks.map((week) => (
        <section key={week[0]} className="mt-6">
          <div className="flex justify-between border-b border-navy pb-1.5">
            <span className="label">Week of {shortDate(week[0])}</span>
            <span className="label text-navy/60">Mon to Sun</span>
          </div>
          <ol>
            {week.map((date) => (
              <DayRow key={date} date={date} today={today} parts={days.get(date)} />
            ))}
          </ol>
        </section>
      ))}
    </main>
  );
}

type DayState = "live" | "scheduled" | "draft" | "empty" | "past";

function dayState(parts: MakerPart[] | undefined, date: string, today: string): DayState {
  if (!parts?.length) return date < today ? "past" : "empty";
  const scheduled = parts.every((p) => p.status === "scheduled");
  if (scheduled && date === today) return "live";
  return scheduled ? "scheduled" : "draft";
}

const TAG: Record<DayState, { text: string; className: string }> = {
  live: { text: "Live", className: "bg-teal text-white" },
  scheduled: { text: "Scheduled", className: "bg-royal text-white" },
  draft: { text: "Draft", className: "border-2 border-navy text-navy" },
  empty: { text: "Empty", className: "border-2 border-dashed border-red-card text-red-card" },
  past: { text: "None", className: "text-navy/40" },
};

function DayRow({ date, today, parts }: { date: string; today: string; parts?: MakerPart[] }) {
  const state = dayState(parts, date, today);
  const tag = TAG[state];
  const [weekday, day] = shortDate(date).split(" ");
  const plays = Math.max(0, ...(parts ?? []).map((p) => p.plays));
  return (
    <li className={`border-b border-track ${date < today ? "opacity-60" : ""}`}>
      <Link
        href={`/maker/day?date=${date}`}
        className="grid grid-cols-[56px_1fr_auto] items-center gap-3 py-2.5 hover:bg-mist sm:grid-cols-[72px_1fr_110px_70px]"
      >
        <span className="font-display leading-none uppercase">
          <span className="block text-sm text-navy/60">{weekday}</span>
          <span className={`block text-[34px] ${date === today ? "text-teal" : ""}`}>{day}</span>
        </span>
        <span className="min-w-0">
          {parts?.length ? (
            parts.map((p) => (
              <span key={p.part} className="block truncate">
                <span className="label mr-2 text-navy/60">P{p.part}</span>
                <span className="font-semibold">{p.title}</span>
                <span className="text-navy/60"> · {p.answer_count} answers</span>
                {p.status === "draft" && p.source_note?.startsWith("Drafted from Wikidata") && (
                  <span className="label ml-2 text-teal">Auto</span>
                )}
              </span>
            ))
          ) : (
            <span className="text-navy/50">{state === "empty" ? "Nothing yet. Make it." : "No Daily"}</span>
          )}
        </span>
        <span className={`label justify-self-end px-2 py-1 ${tag.className}`}>{tag.text}</span>
        <span className="hidden text-right text-sm text-navy/60 sm:block">{plays ? `${plays} plays` : ""}</span>
      </Link>
    </li>
  );
}
