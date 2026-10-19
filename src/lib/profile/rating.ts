// The overall rating, out of 10 like a sports app's player rating (7.6, 8.9).
// Worked out from day scores (each out of 100): the last RATING_DAYS days
// played, the newest counting most. Missed days cost nothing. Asked for by
// Collins on 19 Oct 2026, replacing the 1000-point rating.

/** Days played that count towards the rating, newest first. */
export const RATING_DAYS = 30;
/** Each older day counts this much of the one after it. */
const DECAY = 0.9;

/** Out of 10 to one decimal, or null before a first Daily. */
export function overallRating(days: Map<string, number>): number | null {
  const scores = [...days]
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .slice(0, RATING_DAYS)
    .map(([, s]) => s);
  if (!scores.length) return null;
  let sum = 0;
  let weight = 0;
  scores.forEach((s, i) => {
    sum += s * DECAY ** i;
    weight += DECAY ** i;
  });
  return Math.round(sum / weight) / 10;
}

/** "7.6", a perfect "10", or "–" before a first Daily. */
export function formatRating(rating: number | null): string {
  if (rating === null) return "–";
  return rating >= 10 ? "10" : rating.toFixed(1);
}

/** The badge's colours, red to green like a match rating. */
export const RATING_BANDS = [
  { from: -Infinity, fill: "#D7263D", text: "#FFFFFF" }, // red card
  { from: 5, fill: "#EE7A1A", text: "#FFFFFF" }, // orange
  { from: 6, fill: "#F4C21B", text: "#0C1330" }, // yellow
  { from: 7, fill: "#1E9A4C", text: "#FFFFFF" }, // green
] as const;

const UNRATED = { fill: "#DCE3F5", text: "#0C1330" };

export function ratingColours(rating: number | null): { fill: string; text: string } {
  if (rating === null) return UNRATED;
  return RATING_BANDS.findLast((b) => rating >= b.from)!;
}
