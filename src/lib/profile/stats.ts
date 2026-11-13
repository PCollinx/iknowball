import { partScore } from "@/lib/daily/score";
import { addDays } from "@/lib/time";
import { RATING_FLOOR, TIERS, type TierName } from "./rating";

// What the profile page shows, worked out from a player's finished attempts.
// Rules decided 16 Oct 2026 (see CLAUDE.md, "Rating and scoring").

// Tiers live with the rating, each in its own colour (rating.ts).
export { TIERS, type TierName };

/** Dailies (days) a player needs before they get a tier. */
export const PLACEMENT_DAYS = 3;

export function tierFor(rating: number): TierName {
  return TIERS.findLast((t) => rating >= t.from)!.name;
}

/** The tier above a rating, how far off it is, and how much of the way
 * through the current tier the rating is (0 to 1), Plastic counted from the
 * floor. Null at the top. */
export function nextTier(rating: number): { name: TierName; gap: number; progress: number } | null {
  const i = TIERS.findLastIndex((t) => rating >= t.from);
  const next = TIERS[i + 1];
  if (!next) return null;
  const from = Math.max(RATING_FLOOR, TIERS[i].from);
  return {
    name: next.name,
    gap: Math.round((next.from - rating) * 10) / 10,
    progress: Math.min(1, Math.max(0, (rating - from) / (next.from - from))),
  };
}

export type PlayedPart = { playDate: string; part: number; correct: number; answerCount: number };

/** One day's score out of 100, by share of answers right in each part. */
export function dayScores(parts: PlayedPart[]): Map<string, number> {
  const days = new Map<string, number>();
  for (const p of parts) {
    days.set(p.playDate, (days.get(p.playDate) ?? 0) + partScore(p.part, p.correct, p.answerCount));
  }
  return days;
}

/** A matchweek's score: the best 5 day scores in it, out of 500. */
export function bestFive(scores: number[]): number {
  return [...scores]
    .sort((a, b) => b - a)
    .slice(0, 5)
    .reduce((sum, s) => sum + s, 0);
}

/** Days in a row with a Daily played, up to today. Today not played yet keeps
 * yesterday's streak alive until midnight. */
export function streak(playedDates: Iterable<string>, today: string): number {
  const played = new Set(playedDates);
  let day = played.has(today) ? today : addDays(today, -1);
  let n = 0;
  while (played.has(day)) {
    n++;
    day = addDays(day, -1);
  }
  return n;
}
