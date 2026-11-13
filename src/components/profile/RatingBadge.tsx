import { formatRating, ratingColours } from "@/lib/profile/rating";

/** The overall rating in a circle in its tier's colour: red, orange, yellow,
 * green, deep green, royal (TIERS in rating.ts). Size, border and type size come from the caller. `square`
 * for the team sheet's player ratings. */
export function RatingBadge({ rating, className = "", square = false }: { rating: number | null; className?: string; square?: boolean }) {
  const c = ratingColours(rating);
  return (
    <span
      role="img"
      aria-label={rating === null ? "No rating yet" : `Rating ${formatRating(rating)} out of 10`}
      className={`grid aspect-square place-items-center ${square ? "" : "rounded-full"} border-navy font-display leading-none tabular-nums ${className}`}
      style={{ backgroundColor: c.fill, color: c.text }}
    >
      {formatRating(rating)}
    </span>
  );
}
