import { addDays, matchweekBounds } from "@/lib/time";
import type { FanbaseRow, WeekRow } from "./week";

// The season's table (Collins, 9 Nov 2026, option B of
// https://claude.ai/artifact/W8WzfBiMFE3F6Lq31H8kec): every matchweek's
// points (out of 600) added up, ranked by the total. It counts from launch
// week for 2026/27; later seasons start with the first matchweek of July.

/** Monday of launch week (Fri 20 Nov 2026): the first season's table starts here. */
export const LAUNCH_WEEK = "2026-11-16";
/** Test sites start a week earlier, so the strip can be tried before launch: Wk 1 and Season, then a box a week (Collins, 9 Nov 2026). */
export const TEST_LAUNCH_WEEK = "2026-11-09";

/** The Monday a season's table starts on. */
export function seasonStartsOn(season: number, testSite = false): string {
  if (season === 2026) return testSite ? TEST_LAUNCH_WEEK : LAUNCH_WEEK;
  const july = `${season}-07-01`;
  const monday = matchweekBounds(july).startsOn;
  // A matchweek that starts in June belongs to the season before.
  return monday < july ? addDays(monday, 7) : monday;
}

export type SeasonWeek = { n: number; startsOn: string; endsOn: string };

/** The season's matchweeks from its first up to the one holding `today`, numbered from 1. Empty before it starts. */
export function seasonWeeks(startsOn: string, today: string): SeasonWeek[] {
  const last = matchweekBounds(today).startsOn;
  const weeks: SeasonWeek[] = [];
  for (let monday = startsOn, n = 1; monday <= last; monday = addDays(monday, 7), n++) {
    weeks.push({ n, startsOn: monday, endsOn: addDays(monday, 6) });
  }
  return weeks;
}

export type SeasonRow = {
  userId: string;
  points: number;
  /** Weeks with points on the board. */
  played: number;
  /** Weeks finished top. */
  won: number;
  seconds: number;
  position: number;
};

/** Everyone's season from their weeks, best first. Level on points, more weeks
 * won goes higher, then less time on the counted days. */
export function seasonTable(weeks: WeekRow[][]): SeasonRow[] {
  const byUser = new Map<string, Omit<SeasonRow, "position">>();
  for (const week of weeks) {
    for (const r of week) {
      const u = byUser.get(r.userId) ?? { userId: r.userId, points: 0, played: 0, won: 0, seconds: 0 };
      if (r.points > 0) {
        u.points += r.points;
        u.played += 1;
        u.seconds += r.seconds;
        if (r.position === 1) u.won += 1;
      }
      byUser.set(r.userId, u);
    }
  }
  const rows = [...byUser.values()].filter((r) => r.points > 0);
  rows.sort((a, b) => b.points - a.points || b.won - a.won || a.seconds - b.seconds);
  return rows.map((r) => ({
    ...r,
    position: rows.findIndex((x) => x.points === r.points && x.won === r.won && x.seconds === r.seconds) + 1,
  }));
}

export type FanSeasonRow = {
  clubId: number;
  /** Each week's average, added up. */
  points: number;
  /** Weeks through the gate. */
  played: number;
  /** Weeks finished top of the away end. */
  won: number;
  position: number;
};

/** The away end's season (Collins, 13 Nov 2026): every week a club got
 * through the gate, its fans' average counts; the averages are added up.
 * Level on points, more weeks won goes higher. */
export function fanSeasonTable(weeks: FanbaseRow[][]): FanSeasonRow[] {
  const byClub = new Map<number, Omit<FanSeasonRow, "position">>();
  for (const week of weeks) {
    for (const r of week) {
      const c = byClub.get(r.clubId) ?? { clubId: r.clubId, points: 0, played: 0, won: 0 };
      c.points += r.average;
      c.played += 1;
      if (r.position === 1) c.won += 1;
      byClub.set(r.clubId, c);
    }
  }
  const rows = [...byClub.values()].sort((a, b) => b.points - a.points || b.won - a.won);
  return rows.map((r) => ({ ...r, position: rows.findIndex((x) => x.points === r.points && x.won === r.won) + 1 }));
}
