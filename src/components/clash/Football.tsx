import { useId } from "react";

// A classic football, drawn flat: a centre panel, five panels at the edge and
// the seams between them. Used for a scored kick in Clash's shootout row.
const CENTRE = "12.00,8.00 15.80,10.76 14.35,15.24 9.65,15.24 8.20,10.76";
const EDGE = [
  "12.00,4.70 8.29,2.01 9.71,-2.36 14.29,-2.36 15.71,2.01",
  "18.94,9.74 20.36,5.38 24.94,5.38 26.36,9.74 22.65,12.44",
  "16.29,17.91 20.88,17.91 22.29,22.27 18.58,24.96 14.87,22.27",
  "7.71,17.91 9.13,22.27 5.42,24.96 1.71,22.27 3.12,17.91",
  "5.06,9.74 1.35,12.44 -2.36,9.74 -0.94,5.38 3.64,5.38",
];
const SEAMS = "M12.00 8.00L12.00 4.70M15.80 10.76L18.94 9.74M14.35 15.24L16.29 17.91M9.65 15.24L7.71 17.91M8.20 10.76L5.06 9.74";

export function Football({ className = "" }: { className?: string }) {
  const clip = useId();
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={`block ${className}`}>
      <defs>
        <clipPath id={clip}>
          <circle cx="12" cy="12" r="10.4" />
        </clipPath>
      </defs>
      <circle cx="12" cy="12" r="10.4" fill="#ffffff" />
      <g clipPath={`url(#${clip})`} fill="var(--color-navy)" stroke="var(--color-navy)" strokeWidth="0.8" strokeLinejoin="round">
        <path d={SEAMS} fill="none" />
        <polygon points={CENTRE} />
        {EDGE.map((p) => (
          <polygon key={p} points={p} />
        ))}
      </g>
      <circle cx="12" cy="12" r="10.4" fill="none" stroke="var(--color-navy)" strokeWidth="1.5" />
    </svg>
  );
}
