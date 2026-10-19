import { formatRating, ratingColours } from "@/lib/profile/rating";

/** The overall rating in a circle coloured like a match rating: red, orange,
 * yellow, green. Size, border and type size come from the caller. */
export function RatingBadge({ rating, className = "" }: { rating: number | null; className?: string }) {
  const c = ratingColours(rating);
  return (
    <span
      role="img"
      aria-label={rating === null ? "No rating yet" : `Rating ${formatRating(rating)} out of 10`}
      className={`grid aspect-square place-items-center rounded-full border-navy font-display leading-none tabular-nums ${className}`}
      style={{ backgroundColor: c.fill, color: c.text }}
    >
      {formatRating(rating)}
    </span>
  );
}
