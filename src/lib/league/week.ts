import { partScore } from "@/lib/daily/score";
import { addDays } from "@/lib/time";

// A matchweek's table (decided 16 Oct 2026, see CLAUDE.md "Rating and
// scoring"): each Daily day scores out of 100, a week counts your best 5 of
// the 7 days (out of 500), and ties go to less time used on the counted days.

/** Days in a week that count. */
export const COUNTED_DAYS = 5;
/** Clash sprints in a week that count, and the most they add together. */
export const COUNTED_SPRINTS = 3;
export const CLASH_MAX = 100;

/** One Clash sprint started in the week: its right answers. */
export type WeekSprint = { userId: string; right: number };

/** One finished part of a Daily, as the week reads it. */
export type WeekPart = {
  userId: string;
  playDate: string;
  part: number;
  correct: number;
  answerCount: number;
  seconds: number;
};

export type WeekRow = {
  userId: string;
  /** Monday to Sunday: the day's score out of 100, or null when not played. */
  days: (number | null)[];
  /** Indexes into days of the ones that count. */
  counted: number[];
  /** Best 3 Clash sprints' right answers, at most CLASH_MAX. */
  clash: number;
  /** Daily days plus Clash. */
  points: number;
  /** Seconds used on the counted days, the tie-break. */
  seconds: number;
  position: number;
};

/** Every player's week from their finished parts and Clash sprints, best first. */
export function weekTable(parts: WeekPart[], startsOn: string, sprints: WeekSprint[] = []): WeekRow[] {
  const dates = Array.from({ length: 7 }, (_, i) => addDays(startsOn, i));
  const byUser = new Map<string, { score: (number | null)[]; secs: number[] }>();
  for (const p of parts) {
    const day = dates.indexOf(p.playDate);
    if (day === -1) continue;
    const u = byUser.get(p.userId) ?? { score: Array(7).fill(null), secs: Array(7).fill(0) };
    u.score[day] = (u.score[day] ?? 0) + partScore(p.part, p.correct, p.answerCount);
    u.secs[day] += Math.max(0, p.seconds);
    byUser.set(p.userId, u);
  }
  const rights = new Map<string, number[]>();
  for (const sp of sprints) {
    rights.set(sp.userId, [...(rights.get(sp.userId) ?? []), Math.max(0, sp.right)]);
    if (!byUser.has(sp.userId)) byUser.set(sp.userId, { score: Array(7).fill(null), secs: Array(7).fill(0) });
  }

  const rows = [...byUser].map(([userId, u]) => {
    // Best scores first; on a level score the quicker day counts.
    const counted = u.score
      .map((s, i) => ({ s, i }))
      .filter((d): d is { s: number; i: number } => d.s !== null)
      .sort((a, b) => b.s - a.s || u.secs[a.i] - u.secs[b.i])
      .slice(0, COUNTED_DAYS)
      .map((d) => d.i)
      .sort((a, b) => a - b);
    const best = (rights.get(userId) ?? []).sort((a, b) => b - a).slice(0, COUNTED_SPRINTS);
    const clash = Math.min(CLASH_MAX, best.reduce((sum, r) => sum + r, 0));
    return {
      userId,
      days: u.score,
      counted,
      clash,
      points: counted.reduce((sum, i) => sum + (u.score[i] ?? 0), 0) + clash,
      seconds: counted.reduce((sum, i) => sum + u.secs[i], 0),
    };
  });

  rows.sort((a, b) => b.points - a.points || a.seconds - b.seconds);
  return rows.map((r) => {
    const level = rows.findIndex((x) => x.points === r.points && x.seconds === r.seconds);
    return { ...r, position: level + 1 };
  });
}

export type FanbaseRow = { clubId: number; fans: number; average: number; position: number };

/** Clubs ranked by their fans' average week, once enough of them have played. */
export function fanbaseTable(rows: { points: number; clubId: number | null }[], minFans: number): FanbaseRow[] {
  const clubs = new Map<number, number[]>();
  for (const r of rows) {
    if (r.clubId === null) continue;
    clubs.set(r.clubId, [...(clubs.get(r.clubId) ?? []), r.points]);
  }
  const ranked = [...clubs]
    .filter(([, pts]) => pts.length >= minFans)
    .map(([clubId, pts]) => ({ clubId, fans: pts.length, average: Math.round(pts.reduce((s, p) => s + p, 0) / pts.length) }))
    .sort((a, b) => b.average - a.average || b.fans - a.fans);
  return ranked.map((r) => ({ ...r, position: ranked.findIndex((x) => x.average === r.average) + 1 }));
}
