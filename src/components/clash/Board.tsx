import Link from "next/link";
import type { ReactNode } from "react";
import { SET_SIZE, SPRINT_SECONDS, STATS, type Stat } from "@/lib/clash/rules";

// The kick-off's header, option D "The screen splits" (picked 28 Oct 2026, mocks
// at https://claude.ai/artifact/KXh9PT72Dgos7NwVyzuDXS): the ground's navy
// scoreboard with the call split on a slant inside it, Higher on the light-teal
// end and Lower on the navy end, a red impact burst on the line. Solo, the clock
// sits on top and the players, the stat and your best are lit along the bottom
// (on the right from 1024px). On a challenge the ends are the setter's score
// against your "?".

const BOARD = "mt-4 border-[3px] border-navy bg-navy text-white shadow-[5px_5px_0_var(--color-teal-light)] lg:mt-6 lg:shadow-[6px_6px_0_var(--color-teal-light)]";
const ROW = "flex items-center justify-between gap-3 px-3.5 py-2.5 lg:px-5 lg:py-3";
const SPLIT = "relative overflow-hidden border-y-2 border-slate lg:h-[170px]";
// Higher must stay on the light-teal end at every width: the size follows the
// board's width up to 56px on phones, 88px from 1024px and 104px from 1280px.
const CALL = "absolute font-display leading-[0.85] uppercase text-[clamp(36px,calc(16vw_-_10px),56px)] lg:top-1/2 lg:-translate-y-1/2 lg:text-[88px] xl:text-[104px]";

const clock = `${Math.floor(SPRINT_SECONDS / 60)}:${String(SPRINT_SECONDS % 60).padStart(2, "0")}`;

/** The light-teal end of the split. */
function End() {
  return <span aria-hidden="true" className="clash-end absolute inset-0 bg-teal-light" />;
}

/** The red burst where the two ends meet. */
function Burst({ children }: { children: string }) {
  return (
    <span className="burst absolute top-1/2 left-[52%] grid size-14 -translate-x-1/2 -translate-y-1/2 -rotate-10 place-items-center bg-red-card font-display text-base text-white normal-case lg:size-[92px] lg:text-[26px]">
      {children}
    </span>
  );
}

/** A lit number on the board with its label, label first from 1024px. */
function Cell({ value, label, className = "", children }: { value: ReactNode; label: string; className?: string; children?: ReactNode }) {
  return (
    <div className={`flex min-w-0 flex-col gap-1 px-3 py-2 lg:flex-row-reverse lg:items-baseline lg:justify-between lg:gap-3 lg:px-[18px] lg:py-3 ${className}`}>
      <span className="font-display text-[28px] leading-[0.85] uppercase lg:text-4xl">{value}</span>
      <span className="label min-w-0 text-[9px] text-track lg:text-[10px]">
        {label}
        {children}
      </span>
    </div>
  );
}

/** Solo: the call, the clock, and the numbers: today's stat, or a challenge's
 * own. `best` streams in (see BestCell). A challenge nobody has finished yet
 * uses it too, with its own label. */
export function SoloBoard({ stat, best, label = "Clash · Sprint" }: { stat: Stat; best?: ReactNode; label?: string }) {
  return (
    <section className={`${BOARD} lg:grid lg:grid-cols-[minmax(0,1fr)_300px]`}>
      <div className="min-w-0">
        <div className={ROW}>
          <span className="label text-[11px] text-teal-light">{label}</span>
          <span className="border-2 border-teal-light bg-teal px-2 pt-1 pb-0.5 font-display text-[22px] leading-none text-navy tabular-nums" aria-label={`${SPRINT_SECONDS} seconds on the clock`}>
            {clock}
          </span>
        </div>
        <h1 className={`${SPLIT} h-40 lg:border-b-0`}>
          <End />
          <span className={`${CALL} top-4 left-3.5 text-navy lg:left-7`}>Higher</span>
          <Burst>or</Burst>
          <span className={`${CALL} right-3.5 bottom-4 text-teal-light lg:right-7 lg:bottom-auto`}>Lower</span>
        </h1>
      </div>
      <div className="grid grid-cols-3 divide-x-2 divide-slate lg:grid-cols-1 lg:grid-rows-3 lg:divide-x-0 lg:divide-y-2 lg:border-l-2 lg:border-slate">
        <Cell value={SET_SIZE} label="Players" className="text-teal-light" />
        <Cell value={STATS[stat].short} label={label === "Clash · Sprint" ? "Today's stat" : "The stat"} className="text-teal-light" />
        {best ?? <BestCell best={null} lastCode={null} />}
      </div>
    </section>
  );
}

/** Your best this week, and a link to your latest challenge: the board's last cell. */
export function BestCell({ best, lastCode }: { best: number | null; lastCode: string | null }) {
  return (
    <Cell value={best ?? "–"} label="Your best" className="bg-slate">
      {lastCode && (
        <Link href={`/clash/${lastCode}`} className="mt-1 block font-display text-[13px] tracking-[0.06em] text-white normal-case lg:mt-0 lg:ml-1.5 lg:inline">
          {lastCode} ↗
        </Link>
      )}
    </Cell>
  );
}

/** A challenge link: the setter's score at one end, your "?" at the other. */
export function ChallengeBoard({ code, setter, right, statLabel }: { code: string; setter: string; right: number; statLabel?: string }) {
  return (
    <section className={BOARD}>
      <div className={ROW}>
        <span className="label text-[11px] text-teal-light">Clash · Challenge</span>
        <span className="font-display text-lg tracking-[0.08em] uppercase">{code}</span>
      </div>
      <div className={`${SPLIT} h-[150px]`}>
        <End />
        <span className="absolute top-3 left-3.5 flex max-w-[45%] flex-col gap-1 text-navy lg:left-7">
          <span className="truncate font-display text-xl leading-none uppercase lg:text-2xl">{setter}</span>
          <span className="font-display text-[72px] leading-[0.85] tabular-nums lg:text-[96px]">{right}</span>
        </span>
        <Burst>v</Burst>
        <span className="absolute right-3.5 bottom-3 flex flex-col items-end gap-1 lg:right-7">
          <span className="font-display text-[72px] leading-[0.85] text-teal-light lg:text-[96px]">?</span>
          <span className="font-display text-xl leading-none uppercase lg:text-2xl">You</span>
        </span>
      </div>
      <p className="label px-3.5 py-2 text-[10px] text-track lg:px-5 lg:text-[11px]">
        {SET_SIZE} players · same order · {SPRINT_SECONDS} seconds · one go{statLabel ? ` · ${statLabel}` : ""}
      </p>
    </section>
  );
}
