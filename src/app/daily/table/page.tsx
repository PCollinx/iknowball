import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { clock } from "@/components/daily/clock";
import { FixtureTitle } from "@/components/daily/FixtureTitle";
import { ordinal } from "@/components/daily/formats";
import { Masthead, shortDate } from "@/components/daily/Masthead";
import { getDayTable, type TableRow } from "@/lib/daily/data";
import { KeepyUppy } from "@/components/loading/KeepyUppy";

export const metadata: Metadata = {
  title: "Today's table · iKnowBall",
  description: "Today's Daily, everyone's day score, best first.",
};

/** Rows shown before the table is cut, with your own row added below if you're further down. */
const SHOWN = 50;

export default function TablePage() {
  return (
    <Suspense fallback={<Loading />}>
      <TableScreen />
    </Suspense>
  );
}

// Reads the session and today's attempts, so it renders per request.
async function TableScreen() {
  await connection();
  const day = await getDayTable();
  if (!day) {
    return (
      <main className="mx-auto min-h-dvh max-w-[880px] px-4 lg:px-8">
        <Masthead issue={0} right="Today's table" />
        <h1 className="mt-6 font-display text-[64px] leading-[0.9] uppercase">
          No Daily <span className="text-royal">today</span>
        </h1>
        <p className="mt-3 text-lg">No Daily, no table. Check back tomorrow.</p>
      </main>
    );
  }

  const mine = day.rows.find((r) => r.userId === day.me) ?? null;
  const shown = day.rows.slice(0, SHOWN);
  const below = mine && mine.position > SHOWN && !shown.includes(mine) ? mine : null;

  return (
    <main className="mx-auto min-h-dvh max-w-[880px] px-4 pb-10 lg:px-8">
      <Masthead issue={day.issue} right={`${shortDate(day.playDate)} · Today's table`} />
      <div className="grid grid-cols-[1fr_auto] items-end gap-3 border-b-[3px] border-double border-navy py-3.5">
        <div className="@container min-w-0">
          <span className="label">Today&apos;s table</span>
          <FixtureTitle title={day.title} className="text-[min(52px,var(--fit))] lg:text-[min(80px,var(--fit))]" />
        </div>
        <span className="bg-teal px-2 pt-1 pb-1.5 font-display text-lg text-white uppercase">
          {day.rows.length} {day.rows.length === 1 ? "player" : "players"}
        </span>
      </div>

      {mine ? (
        <p className="mt-3 border-l-[6px] border-royal px-3 py-2.5 text-[17px] font-semibold">
          You&apos;re {ordinal(mine.position)} with {mine.score} out of 100.
          {mine.position === 1 ? " Top of the pile." : ` ${ahead(day.rows, mine)} ahead of you. Tomorrow's another day.`}
        </p>
      ) : (
        <p className="mt-3 border-l-[6px] border-red-card px-3 py-2.5 text-[17px] font-semibold">
          You&apos;re not on it yet.{" "}
          <Link href="/daily" className="text-royal underline underline-offset-[3px]">
            Play today&apos;s Daily
          </Link>
        </p>
      )}

      {day.rows.length === 0 ? (
        <p className="mt-6 text-lg">Nobody has finished yet. First in sets the bar.</p>
      ) : (
        <table className="mt-3.5 w-full border-collapse tabular-nums">
          <thead>
            <tr className="border-b-2 border-navy">
              <th className="label w-12 py-2 text-left text-navy/70">Pos</th>
              <th className="label py-2 text-left text-navy/70">Player</th>
              <th className="label py-2 text-right text-navy/70">Time</th>
              <th className="label w-16 py-2 text-right text-navy/70">Score</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <Row key={r.userId} row={r} me={r.userId === day.me} partial={r.parts < day.parts} />
            ))}
            {below && (
              <>
                <tr aria-hidden="true">
                  <td colSpan={4} className="py-1 text-center font-display text-xl text-navy/40">
                    ⋮
                  </td>
                </tr>
                <Row row={below} me partial={below.parts < day.parts} />
              </>
            )}
          </tbody>
        </table>
      )}

      <p className="mt-3 text-sm text-navy/70">
        A day scores out of 100: Part 1 up to 60, Part 2 up to 40, by the share you got right. Level scores go to less time used.
      </p>
      <Link href="/daily" className="mt-5 inline-block border-[3px] border-royal px-4 py-2 font-display text-xl text-royal uppercase">
        Back to the Daily
      </Link>
    </main>
  );
}

const ahead = (rows: TableRow[], mine: TableRow) => rows.filter((r) => r.position < mine.position).length;

function Row({ row, me, partial }: { row: TableRow; me: boolean; partial: boolean }) {
  return (
    <tr className={me ? "bg-royal text-white" : "border-b border-track"}>
      <td className={`py-2 pl-1 font-display text-2xl ${me ? "" : row.position <= 3 ? "text-royal" : ""}`}>{row.position}</td>
      <td className="py-2">
        <span className="font-semibold">{row.name}</span>
        {row.club && (
          <span className={`ml-2 border px-1 font-display text-sm uppercase ${me ? "border-white/70" : "border-navy/40 text-navy/70"}`}>{row.club}</span>
        )}
        {partial && <span className={`ml-2 text-[13px] ${me ? "text-white/80" : "text-navy/60"}`}>Part 1 only</span>}
      </td>
      <td className={`py-2 text-right ${me ? "text-white/80" : "text-navy/70"}`}>{clock(row.seconds)}</td>
      <td className="py-2 pr-1 text-right font-display text-2xl">{row.score}</td>
    </tr>
  );
}

function Loading() {
  return (
    <main className="mx-auto min-h-dvh max-w-[880px] px-4" aria-busy="true">
      <div className="flex justify-between border-b border-navy pt-3.5 pb-2">
        <span className="label">Today&apos;s table</span>
      </div>
      <KeepyUppy label="Today's table" caption="Adding up the scores…" />
    </main>
  );
}
