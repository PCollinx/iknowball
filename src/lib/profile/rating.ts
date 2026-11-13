// The overall rating, out of 10 like a sports app's player rating (7.6, 8.9).
// Worked out from day scores (each out of 100): the last RATING_DAYS days
// played, the newest counting most. Missed days cost nothing. Asked for by
// Collins on 19 Oct 2026, replacing the 1000-point rating.

/** Days played that count towards the rating, newest first. */
export const RATING_DAYS = 30;
/** Each older day counts this much of the one after it. */
const DECAY = 0.9;

/** The lowest a rating goes. A day score out of 100 reads as 3 + 0.07 × score
 * (Collins, 13 Nov 2026: "slightly favourable", after the beta's middle player
 * scored about 37 a day and sat in red): nil is 3.0, 50 is 6.5, 100 is 10,
 * like a match rating where a quiet game is still a 6. */
export const RATING_FLOOR = 3;

/** A score out of 100 (a day, or a half's share) as a rating out of 10, to one decimal. */
export function toRating(points: number): number {
  const p = Math.min(100, Math.max(0, points));
  return Math.round(RATING_FLOOR * 10 + (10 - RATING_FLOOR) * p / 10) / 10;
}

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
  return toRating(sum / weight);
}

/** Tiers by overall rating, each in its own colour, so a colour change is
 * always a tier change (Collins, 13 Nov 2026). Cut-offs set on the beta's
 * ratings: about a fifth Plastic, the middle Supporter, a 50 a day Ball Knower. */
export const TIERS = [
  { name: "Plastic", from: -Infinity, fill: "#D7263D", text: "#FFFFFF" }, // red card
  { name: "Casual", from: 4.5, fill: "#EE7A1A", text: "#FFFFFF" }, // orange
  { name: "Supporter", from: 5.5, fill: "#F4C21B", text: "#0C1330" }, // yellow
  { name: "Ball Knower", from: 6.5, fill: "#1E9A4C", text: "#FFFFFF" }, // green
  { name: "Pundit", from: 7.5, fill: "#0E6B35", text: "#FFFFFF" }, // deep green
  { name: "Ball God", from: 8.5, fill: "#2440FF", text: "#FFFFFF" }, // royal
] as const;

export type TierName = (typeof TIERS)[number]["name"];

/** "7.6", a perfect "10", or "–" before a first Daily. */
export function formatRating(rating: number | null): string {
  if (rating === null) return "–";
  return rating >= 10 ? "10" : rating.toFixed(1);
}

/** A day score out of 100 as type in its rating's colour (full time and the
 * share card, 22 Oct 2026). Light fills (yellow) get a navy edge to read on white. */
export function scoreInk(points: number): { ink: string; edge: boolean } {
  const band = ratingColours(toRating(points));
  return { ink: band.fill, edge: band.text !== "#FFFFFF" };
}

const UNRATED = { fill: "#D9DFFF", text: "#0C1330" };

export function ratingColours(rating: number | null): { fill: string; text: string } {
  if (rating === null) return UNRATED;
  return TIERS.findLast((t) => rating >= t.from)!;
}
