import { addDays } from "@/lib/time";

// What the profile page shows, worked out from a player's finished attempts.
// Rules decided 16 Oct 2026 (see CLAUDE.md, "Rating and scoring").

export const TIERS = [
  { name: "Plastic", from: -Infinity },
  { name: "Casual", from: 900 },
  { name: "Supporter", from: 1100 },
  { name: "Ball Knower", from: 1300 },
  { name: "Pundit", from: 1500 },
  { name: "Ball God", from: 1750 },
] as const;

export type TierName = (typeof TIERS)[number]["name"];

/** Dailies (days) a player needs before they get a tier. */
export const PLACEMENT_DAYS = 3;

export function tierFor(rating: number): TierName {
  return TIERS.findLast((t) => rating >= t.from)!.name;
}

/** Most points one part can give a day: Part 1 up to 60, Part 2 up to 40. */
export const PART_MAX = { 1: 60, 2: 40 } as Record<number, number>;

export type PlayedPart = { playDate: string; part: number; correct: number; answerCount: number };

/** One day's score out of 100, by share of answers right in each part. */
export function dayScores(parts: PlayedPart[]): Map<string, number> {
  const days = new Map<string, number>();
  for (const p of parts) {
    const share = p.answerCount > 0 ? Math.min(1, Math.max(0, p.correct) / p.answerCount) : 0;
    days.set(p.playDate, (days.get(p.playDate) ?? 0) + Math.round((PART_MAX[p.part] ?? 0) * share));
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
