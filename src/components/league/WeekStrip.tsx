"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { ordinal } from "@/components/daily/formats";
import type { StripWeek } from "@/lib/league/data";

// The matchweek strip (Collins, 9 Nov 2026, option B of
// https://claude.ai/artifact/W8WzfBiMFE3F6Lq31H8kec): a box a week across the
// full width of the screen, scrolling sideways back to week 1, each with your
// place that week (royal when you won it). Season is pinned at the right end.
// It opens with the week you're looking at in the middle.

type Props = { code: string; weeks: StripWeek[]; selected: number | "season"; /** Your place on the season table, if you're on it. */ seasonPlace: number | null };

export function WeekStrip({ code, weeks, selected, seasonPlace }: Props) {
  const strip = useRef<HTMLOListElement>(null);
  useEffect(() => {
    const el = strip.current;
    const on = el?.querySelector<HTMLElement>("[aria-current]");
    if (el && on) el.scrollLeft = on.offsetLeft - el.clientWidth / 2 + on.offsetWidth / 2;
  }, [selected]);
  if (!weeks.length) return null;

  const base = `/league/${code}`;
  return (
    <nav aria-label="Matchweeks" className="-mx-4 mt-4 border-y-2 border-navy lg:mx-0 lg:mt-5">
      <ol ref={strip} className="flex snap-x gap-[5px] overflow-x-auto px-4 py-2 lg:px-0">
        {weeks.map((w) => {
          const on = selected === w.n;
          return (
            <li key={w.n} className="shrink-0 snap-center">
              <Link
                href={w.current ? base : `${base}?w=${w.n}`}
                aria-current={on ? "page" : undefined}
                scroll={false}
                className={`block w-[52px] border-2 border-navy text-center lg:w-[60px] ${on ? "bg-navy text-white shadow-[3px_3px_0_var(--color-teal-light)]" : "bg-white"}`}
              >
                <span className={`label block border-b-2 border-navy py-0.5 text-[9px] ${on ? "bg-teal-light text-navy" : "bg-mist"}`}>
                  Wk {w.n}
                </span>
                <span
                  className={`block font-display text-[22px] leading-[1.15] ${w.current && !on ? "text-teal" : w.position === 1 && !on ? "text-royal" : ""}`}
                >
                  {w.position ?? "–"}
                  <span className="sr-only">{w.position ? ` · you were ${w.position}` : " · you didn't score"}</span>
                </span>
              </Link>
            </li>
          );
        })}
        <li className="sticky right-0 shrink-0 bg-white pl-2 shadow-[-2px_0_0_var(--color-navy)]">
          <Link
            href={`${base}?w=season`}
            aria-current={selected === "season" ? "page" : undefined}
            scroll={false}
            className={`block w-[74px] border-2 border-navy text-center ${selected === "season" ? "bg-navy text-white shadow-[3px_3px_0_var(--color-teal-light)]" : "bg-teal-light"}`}
          >
            <span className={`label block border-b-2 border-navy py-0.5 text-[9px] ${selected === "season" ? "bg-teal-light text-navy" : "bg-mist"}`}>Season</span>
            <span className="block font-display text-[22px] leading-[1.15]">{seasonPlace ? ordinal(seasonPlace) : "Table"}</span>
          </Link>
        </li>
      </ol>
    </nav>
  );
}
