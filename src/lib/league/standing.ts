// How a league's week reads on the hub and the league page ("D", picked
// 26 Oct 2026): the top three on a podium, everyone else in a table with
// their week as a form guide.

import { CLASH_MAX } from "./week";

type Line = { name: string; points: number; mine: boolean; /** The week's Clash points, when known. */ clash?: number };

/** "28 behind tunde", "40 clear of dad", or where you stand when it's level or
 * you haven't played. When the Clash points you still have room for would take
 * you past the player above, it says so instead: "Win 12 more on Clash to pass
 * tunde" (Collins, 31 Oct 2026). Rows best first. */
export function gapLine(rows: Line[]): string {
  const mine = rows.find((r) => r.mine);
  if (!mine || mine.points === 0) return "Not played this week";
  const lead = rows[0];
  if (lead === mine) {
    const next = rows[1];
    if (!next || next.points === 0) return "Top of the table";
    const clear = mine.points - next.points;
    return clear > 0 ? `${clear} clear of ${next.name}` : `Level with ${next.name}`;
  }
  const above = rows[rows.indexOf(mine) - 1];
  const need = above.points - mine.points + 1;
  if (mine.clash !== undefined && need > 0 && need <= CLASH_MAX - mine.clash) return `Win ${need} more on Clash to pass ${above.name}`;
  const behind = lead.points - mine.points;
  return behind > 0 ? `${behind} behind ${lead.name}` : `Level with ${lead.name}`;
}

/** The podium takes the top three who have points; everyone else goes in the table below. Rows best first. */
export function splitPodium<T extends { points: number }>(rows: T[]): { podium: T[]; rest: T[] } {
  const podium = rows.filter((r) => r.points > 0).slice(0, 3);
  return { podium, rest: rows.slice(podium.length) };
}

/** Today's place in the week, 0 for Monday to 6 for Sunday. Both are game dates (YYYY-MM-DD). */
export function dayIndex(startsOn: string, today: string): number {
  return Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${startsOn}T00:00:00Z`)) / 86_400_000);
}

/** One day in the form guide: a score that counts, one dropped (only the best 5 count), a day missed, or a day still to come. */
export type FormDay = { kind: "counts" | "dropped" | "missed" | "ahead"; score: number | null };

/** Monday to Sunday for one player. `today` is the day's index in the week (0 = Monday). */
export function formGuide(days: (number | null)[], counted: number[], today: number): FormDay[] {
  return days.map((score, i) => {
    if (i > today) return { kind: "ahead", score: null };
    if (score === null) return { kind: "missed", score: null };
    return { kind: counted.includes(i) ? "counts" : "dropped", score };
  });
}

/** Places in the team of the week; the next nine sit on the bench. */
export const XI = 11;
export const BENCH = 9;

/** Everyone's top 20 as a team: 11 on the pitch (empty places stay null) and the bench. Rows best first. */
export function teamOfTheWeek<T extends { points: number }>(rows: T[]): { xi: (T | null)[]; bench: T[] } {
  const played = rows.filter((r) => r.points > 0);
  return {
    xi: Array.from({ length: XI }, (_, i) => played[i] ?? null),
    bench: played.slice(XI, XI + BENCH),
  };
}

/** Where you stand against the team: in it, on the bench, further down, or not played. `eleventh` is 11th's points, if the team is full. */
export function yourSpot(mine: { position: number; points: number } | null, eleventh: number | null) {
  if (!mine || mine.points === 0) return { kind: "idle" as const, gap: null };
  if (mine.position <= XI) return { kind: "xi" as const, gap: null };
  const gap = eleventh === null ? null : Math.max(1, eleventh - mine.points + 1);
  return { kind: mine.position <= XI + BENCH ? ("bench" as const) : ("below" as const), gap };
}
