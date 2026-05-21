const STAR_PATH =
  'M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z';

type StarRatingDisplayProps = {
  rating: number;
  maxStars?: number;
  /** Tailwind size class for each star (default h-3 w-3). */
  starClassName?: string;
  className?: string;
};

function clampRating(rating: number, maxStars: number): number {
  if (!Number.isFinite(rating)) return 0;
  return Math.min(maxStars, Math.max(0, rating));
}

function StarIcon({
  fillRatio,
  starClassName,
}: {
  fillRatio: number;
  starClassName: string;
}) {
  const fillPercent = `${Math.min(1, Math.max(0, fillRatio)) * 100}%`;

  return (
    <span className={`relative inline-block shrink-0 ${starClassName}`} aria-hidden>
      <svg className="h-full w-full text-sage-200" viewBox="0 0 20 20" fill="currentColor">
        <path d={STAR_PATH} />
      </svg>
      <span className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: fillPercent }}>
        <svg className="h-full w-full text-sage-600" viewBox="0 0 20 20" fill="currentColor">
          <path d={STAR_PATH} />
        </svg>
      </span>
    </span>
  );
}

/** Filled star row for a 0–5 rating using Sage brand colors. */
export default function StarRatingDisplay({
  rating,
  maxStars = 5,
  starClassName = 'h-3 w-3',
  className = 'inline-flex items-center gap-0.5',
}: StarRatingDisplayProps) {
  const value = clampRating(rating, maxStars);
  const label = `${value.toFixed(1)} out of ${maxStars} stars`;

  return (
    <span className={className} role="img" aria-label={label}>
      {Array.from({ length: maxStars }, (_, index) => (
        <StarIcon key={index} fillRatio={value - index} starClassName={starClassName} />
      ))}
    </span>
  );
}
