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

// Sample players for test sites (Collins, 23 Oct 2026): fills the table so its
// layout can be seen on a day nobody has played. Made up on each view, never
// saved, and never shown on production.

const HANDLES = [
  "ade_ballknower", "tunde", "chioma_fc", "kelz", "sammy_gooner", "jamesy", "femi10", "oluwaseun", "kwame_dey", "dami",
  "bigsam", "rukky", "toyin_", "emeka9", "zainab", "lekan_fc", "mo_salah_fan", "ifeoma", "dapo", "gbenga",
  "jack_w", "ollie", "bisi", "kunle_x", "amaka", "segun_ball", "danny_b", "tobi7", "nneka", "chidi",
];
const SAMPLE_PLAYERS = 160;

/** A made-up field of players, the same on every view; every fifth has no club. */
export function sampleRows<C>(clubs: C[], myClub: C | null): { userId: string; name: string; club: C | null; p1: number; p2: number | null; seconds: number; parts: number; score: number }[] {
  return Array.from({ length: SAMPLE_PLAYERS }, (_, i) => {
    // A rough bell of scores: most in the 40s and 50s, a few near 100 or 0.
    const spread = ((i * 37) % 101) / 100;
    const p1 = Math.round(60 * Math.min(1, Math.max(0, 0.15 + 0.85 * (1 - spread) * (0.6 + ((i * 13) % 40) / 100))));
    const half = i % 13 === 5;
    const p2 = half ? null : Math.round(40 * Math.min(1, ((i * 29) % 100) / 100 + 0.1));
    const name = i % 6 === 2 ? `Guest ${((i * 2654435761) >>> 0).toString(16).slice(0, 4).toUpperCase()}` : `${HANDLES[i % HANDLES.length]}${i >= HANDLES.length ? Math.floor(i / HANDLES.length) : ""}`;
    // Every eighth supports your club, so the fans tab fills too.
    const club = i % 5 === 4 ? null : myClub && i % 8 === 3 ? myClub : (clubs[i % Math.max(1, clubs.length)] ?? null);
    return { userId: `sample-${i}`, name, club, p1, p2, seconds: 150 + ((i * 53) % 260), parts: half ? 1 : 2, score: p1 + (p2 ?? 0) };
  });
}

/** Made-up leagues, so the tab row fills and scrolls (shown with the sample players). */
export const SAMPLE_LEAGUES = ["Sunday League", "Office Ballers", "Uni Lads WhatsApp", "Lagos Derby", "Five-a-side Fridays"];

/** Sample players in each of your leagues: a different dozen in each. */
export function sampleMembers(leagueIndex: number): string[] {
  return Array.from({ length: 12 }, (_, i) => `sample-${(leagueIndex * 17 + i * 11) % SAMPLE_PLAYERS}`);
}
