import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { MAKER_MAIN, MakerBar, MakerHead, Chip } from "@/components/maker/MakerBar";
import { PoolTable } from "@/components/maker/PoolTable";
import { poolOf, POOL_SIZE, recentSets, testDraw, weekNumbers } from "@/lib/clash/maker";
import { statOfDay, STATS, WEEK_STATS, type LiveStat, type Stat } from "@/lib/clash/rules";
import { requireAdmin } from "@/lib/maker/data";
import { gameDate, matchweekBounds } from "@/lib/time";

// The maker's Clash page (Collins, 31 Oct 2026, mocks at
// https://claude.ai/artifact/7fYaL9vEK1xQvVEHgEUFW6): the pool for each stat
// with numbers struck out, the week's stats, a test draw, recent sets and this
// week's sprints.

type Search = Promise<{ stat?: string; draw?: string }>;

export default function MakerClashPage({ searchParams }: { searchParams: Search }) {
  return (
    <Suspense fallback={<main className="min-h-dvh" aria-busy="true" />}>
      <MakerClash searchParams={searchParams} />
    </Suspense>
  );
}

const LIVE = [...new Set(WEEK_STATS)];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const UNIT: Record<LiveStat, string> = { goals: "Goals", apps: "Games", height: "cm", years: "Years", clubs: "Clubs" };
const href = (stat: LiveStat, draw = false) => `/maker/clash?stat=${stat}${draw ? "&draw=1" : ""}`;

async function MakerClash({ searchParams }: { searchParams: Search }) {
  await connection();
  await requireAdmin();
  const params = await searchParams;
  const today = statOfDay(gameDate());
  const stat = LIVE.includes(params.stat as LiveStat) ? (params.stat as LiveStat) : today;
  const [pool, sets, week, draw] = await Promise.all([poolOf(stat), recentSets(), weekNumbers(), params.draw ? testDraw(stat) : null]);
  const todayIndex = Math.round((Date.parse(gameDate()) - Date.parse(matchweekBounds(gameDate()).startsOn)) / 86_400_000);
  const panel = "min-w-0 border-2 border-navy bg-mist p-3";

  return (
    <>
      <MakerBar active="clash" />
      <main className={MAKER_MAIN}>
        <MakerHead
          title="Clash"
          tools={
            <span className="flex flex-wrap items-baseline gap-x-2 text-[13px]">
              <span className="label">This week</span>
              <b className="font-display text-[22px]">{week.sprints}</b> sprints · <b className="font-display text-[22px]">{week.players}</b> players · avg{" "}
              <b className="font-display text-[22px]">{week.average}</b> · <b className="font-display text-[22px]">{week.full}</b> with all three
            </span>
          }
        >
          Who Clash can draw, per stat. Strike a number that&apos;s wrong and it&apos;s left out of every new set; sets already made keep their players.
        </MakerHead>

        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <section className="min-w-0">
            <h2 className="font-display text-[22px] leading-none uppercase">The pool</h2>
            <p className="mt-1 mb-2.5 text-[13px] text-slate">
              The {POOL_SIZE} best-known players at top clubs for each stat. Wiki is how many Wikipedia editions they have, which is how the {POOL_SIZE} are picked. Height and career clubs are the player&apos;s own, so a strike covers every club.
            </p>
            <nav aria-label="Stats" className="mb-2 flex flex-wrap gap-1">
              {LIVE.map((s) => (
                <Link
                  key={s}
                  href={href(s)}
                  aria-current={s === stat ? "page" : undefined}
                  className="border-2 border-navy px-2 py-1 text-[13px] font-semibold aria-[current=page]:bg-navy aria-[current=page]:text-white"
                >
                  {STATS[s].short}
                  {s === today && <span className="ml-1 bg-teal-light px-1 text-[9px] text-navy uppercase">Today</span>}
                </Link>
              ))}
            </nav>
            <PoolTable key={stat} stat={stat} rows={pool} unit={UNIT[stat]} />
          </section>

          <div className="grid min-w-0 gap-4">
            <section className={panel}>
              <h2 className="font-display text-[22px] leading-none uppercase">Today&apos;s stat</h2>
              <ol className="mt-2 grid grid-cols-7 gap-1">
                {WEEK_STATS.map((s, i) => (
                  <li
                    key={DAYS[i]}
                    className={`min-w-0 border-2 border-navy px-0.5 py-1 text-center text-[10px] font-semibold uppercase ${i === todayIndex ? "bg-navy text-white" : "bg-white"}`}
                  >
                    {DAYS[i]}
                    <b className={`block font-display text-xs [overflow-wrap:anywhere] ${i === todayIndex ? "text-teal-light" : ""}`}>{STATS[s].short}</b>
                  </li>
                ))}
              </ol>
            </section>

            <section className={panel}>
              <h2 className="font-display text-[22px] leading-none uppercase">Test draw</h2>
              <p className="mt-1 mb-2 text-[13px] text-slate">A {STATS[stat].short.toLowerCase()} set as a player would get it now. Nothing is saved.</p>
              <Link href={href(stat, true)} className="btn-teal btn-press inline-flex items-center gap-4 px-3 py-1 font-display text-lg uppercase">
                <span>{draw ? "Draw again" : "Draw a set"}</span>
                <span aria-hidden="true">→</span>
              </Link>
              {draw && <Draw items={draw} stat={stat} />}
            </section>

            <section>
              <h2 className="font-display text-[22px] leading-none uppercase">Recent sets</h2>
              <div className="mt-2 overflow-x-auto border-2 border-navy">
                <table className="w-full border-collapse text-[13px]">
                  <thead>
                    <tr className="bg-mist text-left text-[10px] tracking-[0.06em] uppercase">
                      <th className="px-2 py-1.5">Code</th>
                      <th className="px-2 py-1.5">Stat</th>
                      <th className="px-2 py-1.5">Made by</th>
                      <th className="px-2 py-1.5 text-right">Played</th>
                      <th className="px-2 py-1.5 text-right">Best</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sets.map((s) => (
                      <tr key={s.code} className="border-t border-track">
                        <td className="px-2 py-1 font-display tracking-[0.06em]">
                          <Link href={`/clash/${s.code}`} className="hover:underline">
                            {s.code}
                          </Link>
                        </td>
                        <td className="px-2 py-1">{STATS[s.stat as Stat]?.short ?? s.stat}</td>
                        <td className="px-2 py-1">
                          <span className="mr-1">{s.by}</span>
                          {s.rematch && <Chip kind="plain">Rematch</Chip>}
                        </td>
                        <td className="px-2 py-1 text-right tabular-nums">{s.played}</td>
                        <td className="px-2 py-1 text-right tabular-nums">{s.best ?? "–"}</td>
                      </tr>
                    ))}
                    {!sets.length && (
                      <tr>
                        <td colSpan={5} className="px-2 py-3 text-slate">
                          No sprints yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </div>
      </main>
    </>
  );
}

function Draw({ items, stat }: { items: { name: string; value: number }[]; stat: LiveStat }) {
  const names = new Set(items.map((i) => i.name));
  const close = items.slice(1).filter((it, i) => Math.abs(it.value - items[i].value) < STATS[stat].gap).length;
  const check = (ok: boolean, text: string) => (
    <li className={`border-[1.5px] px-1.5 ${ok ? "border-navy bg-teal-light" : "border-red-card text-red-card"}`}>{text}</li>
  );
  return (
    <>
      <ol className="mt-2 flex flex-wrap gap-1 text-xs">
        {items.slice(0, 10).map((it, i) => (
          <li key={i} className="border-[1.5px] border-navy bg-white px-1.5 whitespace-nowrap">
            {it.name.split(" ").at(-1)}
            <b className="ml-1 font-display text-sm text-royal">{it.value}</b>
          </li>
        ))}
        <li className="text-slate">… {Math.max(0, items.length - 10)} more</li>
      </ol>
      <ul className="mt-2 flex flex-wrap gap-1.5 text-xs">
        {check(items.length === 40, `${items.length} players`)}
        {check(names.size === items.length, names.size === items.length ? "No player twice" : "A player twice")}
        {check(close === 0, close ? `${close} pairs closer than ${STATS[stat].gap}` : `Neighbours ${STATS[stat].gap}+ apart`)}
      </ul>
    </>
  );
}
