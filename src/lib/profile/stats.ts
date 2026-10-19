import { partScore } from "@/lib/daily/score";
import { addDays } from "@/lib/time";

// What the profile page shows, worked out from a player's finished attempts.
// Rules decided 16 Oct 2026 (see CLAUDE.md, "Rating and scoring").

/** Tiers by overall rating out of 10 (see rating.ts). Cut-offs to tune in the beta. */
export const TIERS = [
  { name: "Plastic", from: -Infinity },
  { name: "Casual", from: 4 },
  { name: "Supporter", from: 5.5 },
  { name: "Ball Knower", from: 7 },
  { name: "Pundit", from: 8 },
  { name: "Ball God", from: 9 },
] as const;

export type TierName = (typeof TIERS)[number]["name"];

/** Dailies (days) a player needs before they get a tier. */
export const PLACEMENT_DAYS = 3;

export function tierFor(rating: number): TierName {
  return TIERS.findLast((t) => rating >= t.from)!.name;
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
