import { Football } from "./Football";

/** The shootout row: every answer as a penalty, a football for scored, the same
 * ball faded with a red stroke through it for missed (Collins, 23 Oct 2026). */
export function KickRow({ kicks, placeholder = false, size = "size-[22px]", className = "" }: { kicks: string; placeholder?: boolean; size?: string; className?: string }) {
  const right = [...kicks].filter((k) => k === "1").length;
  return (
    <ol className={`flex min-h-4.5 flex-wrap items-center gap-1 lg:gap-1.25 ${className}`} aria-label={`${right} scored, ${kicks.length - right} missed`}>
      {[...kicks].map((k, i) => (
        <li key={i} className={`relative ${size}`}>
          <Football className={`size-full ${k === "1" ? "" : "opacity-35"}`} />
          {k !== "1" && (
            <svg viewBox="0 0 24 24" aria-hidden="true" className="absolute inset-0 size-full">
              <path d="M3.5 20.5 L20.5 3.5" stroke="var(--color-red-card)" strokeWidth="3.2" strokeLinecap="round" />
            </svg>
          )}
        </li>
      ))}
      {placeholder && !kicks.length && <li className="label text-navy/50">Your kicks go here</li>}
    </ol>
  );
}
