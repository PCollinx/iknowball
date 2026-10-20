"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { fanName } from "@/components/daily/fixture";
import { ordinal } from "@/components/daily/formats";
import type { BoardRow, BoardTab } from "@/lib/league/data";
import type { Club } from "@/lib/profile/club";

// The League on the home page: a scoreboard (picked 20 Oct 2026). The tabs
// (your leagues, Everyone, your club's fans) switch the board in place to show
// your standing there; only the navy scoreboard block opens the full table.
// With no league yet, a "+ League" tab holds the pitch to start one.

const WEEK_MAX = 600;
const NEW = "new";

export function LeagueBoard({ tabs, club }: { tabs: BoardTab[]; club: Club | null }) {
  const hasLeague = tabs.some((t) => t.kind === "league");
  const [selected, setSelected] = useState(hasLeague ? tabs[0].key : NEW);
  const id = useId();
  const tab = tabs.find((t) => t.key === selected) ?? null;
  const label = (t: BoardTab) => (t.kind === "fans" && club ? `${fanName(club.name)} fans` : t.label);

  const keys = [...(hasLeague ? [] : [NEW]), ...tabs.map((t) => t.key)];
  return (
    <article className="min-w-0 border-2 border-navy bg-white">
      {/* Many leagues scroll sideways inside the card rather than widening it. */}
      <div role="tablist" aria-label="Tables" className="flex snap-x gap-1.5 overflow-x-auto overscroll-x-contain border-b-2 border-navy p-2">
        {keys.map((key) => {
          const t = tabs.find((x) => x.key === key);
          const on = key === selected;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              id={`${id}-${key}`}
              aria-selected={on}
              aria-controls={`${id}-panel`}
              onClick={(e) => {
                setSelected(key);
                e.currentTarget.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
              }}
              title={t ? label(t) : undefined}
              className={`max-w-44 shrink-0 snap-start truncate border-[1.5px] border-navy px-2.5 py-1 text-xs font-semibold whitespace-nowrap lg:px-3 lg:py-1.5 lg:text-[13px] ${on ? "bg-navy text-white" : "hover:bg-mist"}`}
            >
              {t ? label(t) : "+ League"}
            </button>
          );
        })}
      </div>

      <div id={`${id}-panel`} role="tabpanel" aria-labelledby={`${id}-${selected}`} className="grid grid-cols-[96px_minmax(0,1fr)] lg:grid-cols-[120px_minmax(0,1fr)]">
        {tab ? <Standing tab={tab} name={label(tab)} /> : <Pitch />}
      </div>
    </article>
  );
}

function Standing({ tab, name }: { tab: BoardTab; name: string }) {
  const { mine, top } = tab;
  const fans = tab.kind === "fans";
  const placed = mine && (fans || mine.points > 0);
  const rows = mine && !top.some((r) => r.mine) ? [...top, mine] : top;
  const gap = mine && top[0] ? top[0].points - mine.points : 0;
  const note = moveNote(tab.moved) ?? (placed && tab.kind !== "league" ? `Of ${tab.size}` : "This week");

  return (
    <>
      <Link
        href={tab.href}
        aria-label={`Open the ${name} table`}
        className="group flex flex-col justify-between bg-navy p-2.5 text-center text-white transition-colors hover:bg-royal lg:p-3"
      >
        <span className="label text-[10px] text-teal-light lg:text-xs">03</span>
        <Place value={placed ? ordinal(mine.position) : "–"} />
        <span className="label text-[10px] lg:text-xs">
          {note} <span aria-hidden="true" className="inline-block transition-transform group-hover:translate-x-0.5">↗</span>
        </span>
      </Link>

      <div className="p-2.5 px-3 lg:p-3 lg:px-4">
        {rows.length ? (
          <ol className="mb-2 text-sm lg:mb-2.5 lg:text-[15px]">
            {rows.map((r) => (
              <Row key={r.key} row={r} fans={fans} />
            ))}
          </ol>
        ) : (
          <p className="mb-2 text-sm lg:text-[15px]">
            {fans ? "No club has 25 fans playing yet this week." : "Nobody has played yet this week. Be first."}
          </p>
        )}
        <div className="mb-1 h-2 bg-track lg:mb-1.5" aria-hidden="true">
          <div
            className="h-2 origin-left bg-royal motion-safe:animate-fill-bar"
            style={{ width: `${Math.min(100, ((mine?.points ?? 0) / WEEK_MAX) * 100)}%` }}
          />
        </div>
        <p className="text-[13px] tabular-nums lg:text-sm">
          {fans ? (
            mine ? (
              <>Your club averages {mine.points} / {WEEK_MAX}</>
            ) : (
              "Your club needs 25 fans playing to be ranked"
            )
          ) : (
            <>
              {mine?.points ?? 0} / {WEEK_MAX}
              {placed && gap > 0 && ` · ${gap} off top`}
            </>
          )}
        </p>
      </div>
    </>
  );
}

function Pitch() {
  return (
    <>
      <div className="flex flex-col justify-between bg-navy p-2.5 text-center text-white lg:p-3">
        <span className="label text-[10px] text-teal-light lg:text-xs">03</span>
        <Place value="–" />
        <span className="label text-[10px] lg:text-xs">This week</span>
      </div>
      <div className="p-3 lg:p-4">
        <span className="label text-[10px] text-royal lg:text-xs">The League</span>
        <p className="mt-1 mb-3 text-sm lg:text-[15px]">Mini-leagues with your mates. Your best 5 Dailies and best 3 sprints count each week.</p>
        <Link
          href="/league"
          className="btn-teal btn-press inline-block px-2.5 py-1 font-display text-lg whitespace-nowrap uppercase min-[380px]:px-3 min-[380px]:text-xl"
        >
          Start a league →
        </Link>
      </div>
    </>
  );
}

function moveNote(moved: number | null): string | null {
  if (!moved) return null;
  return moved > 0 ? `▲ ${moved} today` : `▼ ${-moved} today`;
}

/** The place in big scoreboard numbers, the suffix ("rd") set smaller. */
function Place({ value }: { value: string }) {
  const m = value.match(/^(\d+)(\D+)$/);
  return (
    <span className="font-display text-[54px] leading-[0.85] text-teal-light uppercase lg:text-[74px]">
      {m ? (
        <>
          {m[1]}
          <span className="text-[22px] lg:text-[28px]">{m[2]}</span>
        </>
      ) : (
        value
      )}
    </span>
  );
}

function Row({ row, fans }: { row: BoardRow; fans: boolean }) {
  return (
    <li
      className={`flex justify-between gap-2 py-[3px] lg:py-1 ${row.mine ? "-mx-1.5 bg-mist px-1.5 font-semibold lg:-mx-2 lg:px-2" : "border-b border-track"}`}
    >
      <span className="min-w-0 truncate">
        <b className="font-display">{fans || row.points > 0 ? row.position : "–"}</b>
        &nbsp; {fans ? fanName(row.name) : row.name}
      </span>
      <span className="font-display tabular-nums">{row.points}</span>
    </li>
  );
}
