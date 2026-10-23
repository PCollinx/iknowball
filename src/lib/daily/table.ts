import { ordinal } from "@/components/daily/formats";
import { rankTable, topPercent, type TableEntry } from "./score";

// Today's table as the page lays it out ("Podium and programme", picked
// 23 Oct 2026): the top three on the podium, the printed table under them to
// the cut, and the stretch around you when you're further down.

/** Places shown before the table is cut. */
export const SHOWN = 50;
/** Rows either side of you in "Around you". */
const AROUND = 2;

type Named = TableEntry & { name: string };

export type TableView<T> = {
  podium: T[];
  /** 4th place down to the cut. */
  list: T[];
  /** Places left out between the list and "Around you" (or the end). */
  hidden: { from: number; to: number } | null;
  /** You and the rows either side, when you're below the cut. */
  around: T[];
  mine: T | null;
  topPercent: number | null;
  players: number;
};

/** One tab's table: its players ranked among themselves, cut and centred on you. */
export function tableView<T extends Named>(entries: T[], me: string | null, shown = SHOWN): TableView<T & { position: number }> {
  const rows = rankTable(entries);
  const at = rows.findIndex((r) => r.userId === me);
  const mine = at === -1 ? null : rows[at];
  const around = at >= shown ? rows.slice(Math.max(shown, at - AROUND), at + AROUND + 1) : [];
  // Places are counted by row, so the gap reads "51st to 58th" even across ties.
  const resumes = around.length ? rows.indexOf(around[0]) : rows.length;
  return {
    podium: rows.slice(0, 3),
    list: rows.slice(3, shown),
    hidden: resumes > shown ? { from: shown + 1, to: resumes } : null,
    around,
    mine,
    topPercent: mine ? topPercent(mine.score, rows.map((r) => r.score)) : null,
    players: rows.length,
  };
}

/** The line under your place: what's between you and the row above. */
export function chaseLine<T extends Named & { position: number }>(rows: T[], mine: T): string {
  const ranked = [...rows].sort((a, b) => a.position - b.position);
  const at = ranked.findIndex((r) => r.userId === mine.userId);
  if (at <= 0) return ranked.length === 1 ? "First in. Everyone else is chasing you." : "Top of the pile.";
  const above = ranked[at - 1];
  if (above.score === mine.score) {
    const quicker = mine.seconds - above.seconds;
    if (quicker <= 0) return `Level with ${above.name} on points and time.`;
    return `Level with ${above.name} on ${mine.score}, who was ${quicker} ${quicker === 1 ? "second" : "seconds"} quicker.`;
  }
  const gap = above.score - mine.score;
  return `${gap} ${gap === 1 ? "point" : "points"} off ${above.name} in ${ordinal(above.position)}.`;
}
