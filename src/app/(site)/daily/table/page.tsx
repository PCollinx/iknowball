import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { clock } from "@/components/daily/clock";
import { fanName, headlineFixture } from "@/components/daily/fixture";
import { ordinal } from "@/components/daily/formats";
import { Masthead, shortDate } from "@/components/daily/Masthead";
import { NextDaily } from "@/components/daily/NextDaily";
import { ShirtBack } from "@/components/daily/ShirtBack";
import { KeepyUppy } from "@/components/loading/KeepyUppy";
import { getDayTable, type DayTable, type TableRow } from "@/lib/daily/data";
import { isTestSite } from "@/lib/daily/sample";
import { chaseLine, tableView, type TableView } from "@/lib/daily/table";
import { kitOf } from "@/lib/profile/club";
import { gameDateClosesAt } from "@/lib/time";

// Today's table, "Podium and programme" (picked 23 Oct 2026): tabs for
// everyone, your leagues and your club's fans; the top three in their club's
// shirts on a podium; your line in slate; then the rest printed like a
// programme page, cut at 50 with the stretch around you below.

export const metadata: Metadata = {
  title: "Today's table · iKnowBall",
  description: "Today's Daily, everyone's day score, best first.",
};

export default function TablePage({ searchParams }: PageProps<"/daily/table">) {
  return (
    <Suspense fallback={<Loading />}>
      <TableScreen searchParams={searchParams} />
    </Suspense>
  );
}

type Tab = { key: string; label: string; rows: TableRow[] };

/** Everyone, then each of your leagues, then your club's fans. */
function tabsOf(day: DayTable): Tab[] {
  const everyone: Tab = { key: "everyone", label: "Everyone", rows: day.rows };
  const leagues = day.leagues.map((l) => {
    const members = new Set(l.members);
    return { key: l.code, label: l.name, rows: day.rows.filter((r) => members.has(r.userId)) };
  });
  const club = day.club;
  const fans = club ? [{ key: "fans", label: `${fanName(club.name)} fans`, rows: day.rows.filter((r) => r.club?.id === club.id) }] : [];
  return [everyone, ...leagues, ...fans];
}

// Reads the session, today's attempts and the tab in the address, so it renders per request.
async function TableScreen({ searchParams }: Pick<PageProps<"/daily/table">, "searchParams">) {
  await connection();
  const { t, sample } = await searchParams;
  const day = await getDayTable(sample === "1");
  if (!day) {
    return (
      <main className="mx-auto w-full max-w-[1180px] flex-1 px-4 lg:px-12">
        <Masthead issue={0} right="Today's table" />
        <h1 className="mt-6 font-display text-[64px] leading-[0.9] uppercase">
          No Daily <span className="sash-mark">today</span>
        </h1>
        <p className="mt-3 text-lg">No Daily, no table. Check back tomorrow.</p>
      </main>
    );
  }

  const tabs = tabsOf(day);
  const tab = tabs.find((x) => x.key === t) ?? tabs[0];
  const view = tableView(tab.rows, day.me);
  const actions = <Actions playDate={day.playDate} />;

  return (
    <main className="mx-auto w-full max-w-[1180px] flex-1 px-4 pb-10 lg:px-12">
      <Masthead issue={day.issue} right={`${shortDate(day.playDate)} · Today's table`} />
      <div className="lg:grid lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)] lg:items-start lg:gap-14 xl:grid-cols-[480px_minmax(0,1fr)]">
        <div className="grid gap-5 pt-3 lg:gap-6 lg:pt-5">
          <div>
            <span className="label text-royal">
              {headlineFixture(day.title)} · {day.rows.length} played
            </span>
            <h1 className="mt-1 font-display text-[56px] leading-[0.86] uppercase lg:text-[84px] lg:leading-[0.84]">
              Today&apos;s <span className="sash-mark">table</span>
            </h1>
            {tabs.length > 1 && <Tabs tabs={tabs} on={tab.key} sample={day.sample} />}
          </div>
          {view.podium.length > 0 && <Podium rows={view.podium} me={day.me} />}
          <YourLine view={view} rows={[...view.podium, ...view.list, ...view.around]} parts={day.parts} tab={tab} />
          <div className="hidden lg:block">{actions}</div>
        </div>

        <section className="mt-6 lg:mt-5" aria-label={`${tab.label} table`}>
          {view.players === 0 ? (
            <p className="border-y-2 border-navy py-4 text-lg">
              {tab.key === "everyone" ? "Nobody has finished yet. First in sets the bar." : `Nobody from ${tab.label} has played today yet.`}
            </p>
          ) : (
            view.players > 3 && <Programme view={view} me={day.me} parts={day.parts} />
          )}
          <p className="mt-3 text-[13px] text-slate lg:text-sm">
            A day scores out of 100: Part 1 up to 60, Part 2 up to 40. Level scores go to less time used.
          </p>
        </section>
        <div className="mt-6 lg:hidden">{actions}</div>
      </div>
      {isTestSite() && <SampleSwitch on={day.sample} tab={tab.key} />}
    </main>
  );
}

function Tabs({ tabs, on, sample }: { tabs: Tab[]; on: string; sample: boolean }) {
  return (
    <nav aria-label="Tables" className="mt-3 flex snap-x gap-1.5 overflow-x-auto overscroll-x-contain pb-1 lg:mt-3.5 lg:flex-wrap">
      {tabs.map((x) => (
        <Link
          key={x.key}
          href={{ pathname: "/daily/table", query: { ...(x.key === "everyone" ? {} : { t: x.key }), ...(sample ? { sample: "1" } : {}) } }}
          scroll={false}
          aria-current={x.key === on ? "page" : undefined}
          className={`max-w-56 shrink-0 snap-start truncate border-[1.5px] border-navy px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap lg:px-3 lg:text-[13px] ${x.key === on ? "bg-navy text-white" : "hover:bg-mist"}`}
        >
          {x.label} · {x.rows.length}
        </Link>
      ))}
    </nav>
  );
}

/** The top three in their club's shirts, place on the back, 2nd · 1st · 3rd. */
function Podium({ rows, me }: { rows: TableRow[]; me: string | null }) {
  const steps = [
    { row: rows[1], shirt: "w-[82%] -rotate-3", step: "h-16 lg:h-[84px]" },
    { row: rows[0], shirt: "w-full", step: "h-[92px] lg:h-[120px]" },
    { row: rows[2], shirt: "w-[74%] rotate-3", step: "h-11 lg:h-[58px]" },
  ];
  return (
    <ol className="grid grid-cols-3 items-end gap-2 lg:gap-3" aria-label="Top three">
      {steps.map(({ row, shirt, step }, i) => (
        <li key={row?.userId ?? i} className="grid justify-items-center">
          {row && (
            <>
              <span className={`mb-1.5 block lg:mb-2 ${shirt}`}>
                <ShirtBack kit={kitOf(row.club)} num={row.position} name={row.userId === me ? "You" : row.name} />
              </span>
              <span className={`flex w-full flex-col items-center bg-navy pt-1.5 text-white shadow-[4px_4px_0_var(--color-sky)] lg:pt-2 lg:shadow-[5px_5px_0_var(--color-sky)] ${step}`}>
                <span className="font-display text-[30px] leading-[0.9] text-teal-light tabular-nums lg:text-[40px]">{row.score}</span>
                <span className="label text-[9px] text-white/80 lg:text-[10px]">{clock(row.seconds)} used</span>
              </span>
            </>
          )}
        </li>
      ))}
    </ol>
  );
}

/** Your place in slate with each half's points, or the way in if you're not on it. */
function YourLine({ view, rows, parts, tab }: { view: TableView<TableRow>; rows: TableRow[]; parts: number; tab: Tab }) {
  const mine = view.mine;
  if (!mine) {
    if (tab.key !== "everyone") return null;
    return (
      <div className="sash-edge border-[2.5px] border-navy bg-slate py-3 pr-[11%] pl-3 text-white shadow-[4px_4px_0_var(--color-navy)] lg:py-4 lg:pl-4">
        <span className="label">Your line</span>
        <p className="mt-1 font-display text-[30px] leading-[0.9] uppercase">You&apos;re not on it yet</p>
        <Link href="/daily" className="btn-teal btn-press mt-3 inline-block px-3 py-1 font-display text-xl uppercase">
          Play today&apos;s Daily →
        </Link>
      </div>
    );
  }
  const halves = [
    { label: "1st", value: mine.p1 },
    { label: "2nd", value: parts > 1 ? mine.p2 : null },
  ];
  const suffix = ordinal(mine.position).replace(String(mine.position), "");
  return (
    <div className="sash-edge border-[2.5px] border-navy bg-slate py-2.5 pr-[11%] pl-3 text-white shadow-[4px_4px_0_var(--color-navy)] lg:py-3.5 lg:pl-4 lg:shadow-[5px_5px_0_var(--color-navy)]">
      <div className="hidden justify-between lg:flex">
        <span className="label">Your line</span>
        {view.topPercent && <span className="label">Top {view.topPercent}%</span>}
      </div>
      <div className="grid grid-cols-[auto_minmax(0,1fr)_repeat(3,40px)] items-end gap-2 lg:mt-2 lg:grid-cols-[auto_repeat(3,minmax(0,1fr))] lg:gap-3">
        <span className="font-display text-[60px] leading-[0.8] tabular-nums lg:text-[96px]">
          {mine.position}
          <span className="text-2xl lg:text-[34px]">{suffix}</span>
        </span>
        <span className="label leading-normal lg:hidden">
          You
          {view.topPercent && (
            <>
              <br />
              Top&nbsp;{view.topPercent}%
            </>
          )}
        </span>
        {halves.map((h) => (
          <span key={h.label} className="text-center">
            <span className="label block text-[9px] lg:text-[10px]">{h.label}</span>
            <span className="font-display text-2xl leading-none tabular-nums lg:text-[30px]">{h.value ?? "–"}</span>
          </span>
        ))}
        <span className="text-center">
          <span className="label block text-[9px] lg:text-[10px]">Pts</span>
          <span className="font-display text-[30px] leading-none tabular-nums lg:text-[40px]">{mine.score}</span>
        </span>
      </div>
      <p className="mt-2 text-[13px] leading-snug lg:mt-2.5 lg:text-sm">{chaseLine(rows, mine)}</p>
    </div>
  );
}

const GRID = "grid grid-cols-[30px_30px_minmax(0,1fr)_40px_32px] items-center gap-2 lg:grid-cols-[44px_40px_minmax(0,1fr)_72px_80px_56px] lg:gap-3";

/** 4th down to the cut, printed; then the gap and the rows around you. */
function Programme({ view, me, parts }: { view: TableView<TableRow>; me: string | null; parts: number }) {
  const { list, hidden, around } = view;
  return (
    <>
      <div className={`${GRID} label border-b-2 border-navy pb-1.5 text-[10px] text-slate lg:text-[11px]`} aria-hidden="true">
        <span>Pos</span>
        <span />
        <span>Player</span>
        <span className="hidden lg:block">Club</span>
        <span className="text-right">Time</span>
        <span className="text-right">Pts</span>
      </div>
      <ol>
        {list.map((r) => (
          <Row key={r.userId} row={r} me={r.userId === me} parts={parts} />
        ))}
      </ol>
      {hidden && (
        <p className="label border-b-4 border-double border-navy py-2 text-center text-[10px] text-slate lg:py-2.5 lg:text-[11px]">
          {ordinal(hidden.from)} to {ordinal(hidden.to)} · {hidden.to - hidden.from + 1} more
        </p>
      )}
      {around.length > 0 && (
        <>
          <h2 className="label pt-2.5 pb-1 text-[10px] text-royal lg:pt-3 lg:text-[11px]">Around you</h2>
          <ol>
            {around.map((r) => (
              <Row key={r.userId} row={r} me={r.userId === me} parts={parts} />
            ))}
          </ol>
        </>
      )}
    </>
  );
}

function Row({ row, me, parts }: { row: TableRow; me: boolean; parts: number }) {
  return (
    <li className={`${GRID} border-b border-track py-1 lg:py-[5px] ${me ? "-mx-1.5 bg-slate px-1.5 text-white lg:-mx-2 lg:px-2" : ""}`}>
      <span className="font-display text-[22px] leading-none tabular-nums lg:text-[28px]">{row.position}</span>
      <span aria-hidden="true">
        <ShirtBack kit={kitOf(row.club)} />
      </span>
      <span className="min-w-0 truncate font-semibold lg:text-[17px]">
        {me ? "You" : row.name}
        {row.parts < parts && <span className={`ml-1.5 text-[11px] font-normal lg:text-[13px] ${me ? "text-white/80" : "text-slate"}`}>Part 1 only</span>}
      </span>
      <span className={`hidden font-display text-[15px] uppercase lg:block ${me ? "text-white/80" : "text-slate"}`}>{row.club?.short_name ?? "–"}</span>
      <span className={`text-right text-[13px] tabular-nums lg:text-[15px] ${me ? "text-white/80" : "text-slate"}`}>{clock(row.seconds)}</span>
      <span className="text-right font-display text-[22px] leading-none tabular-nums lg:text-[28px]">{row.score}</span>
    </li>
  );
}

/** Test sites only: fill the table with made-up players to see it full. */
function SampleSwitch({ on, tab }: { on: boolean; tab: string }) {
  const query = { ...(tab === "everyone" ? {} : { t: tab }), ...(on ? {} : { sample: "1" }) };
  return (
    <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-2 border-dashed border-red-card p-3">
      <span className="text-sm font-semibold text-red-card">
        {on ? "Test site only. Sample players are filling this table; nothing is saved." : "Test site only. See the table full of made-up players (nothing is saved)."}
      </span>
      <Link href={{ pathname: "/daily/table", query }} scroll={false} className="shrink-0 bg-red-card px-4 py-1.5 font-display text-lg text-white uppercase">
        {on ? "Hide sample players" : "Fill with sample players"}
      </Link>
    </div>
  );
}

function Actions({ playDate }: { playDate: string }) {
  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-4">
      <Link href="/daily" className="btn-white btn-press flex items-center justify-between px-3.5 py-2.5 font-display text-2xl leading-none uppercase lg:px-4 lg:py-3 lg:text-[28px]">
        <span>
          Back to the <span className="sash-mark">Daily</span>
        </span>
        <span aria-hidden="true">←</span>
      </Link>
      <div className="flex items-center justify-between border-t-2 border-navy pt-2.5 lg:border-0 lg:pt-0">
        <span className="label lg:sr-only">Next Daily in</span>
        <NextDaily
          closesAt={gameDateClosesAt(playDate).toISOString()}
          className="border-2 border-navy bg-teal px-2 text-[30px] text-white shadow-[3px_3px_0_var(--color-navy)] lg:py-1 lg:text-[34px]"
        />
      </div>
    </div>
  );
}

function Loading() {
  return (
    <main className="mx-auto w-full max-w-[1180px] flex-1 px-4 lg:px-12" aria-busy="true">
      <div className="flex justify-between border-b border-navy pt-3.5 pb-2">
        <span className="label">Today&apos;s table</span>
      </div>
      <KeepyUppy label="Today's table" caption="Adding up the scores…" />
    </main>
  );
}
