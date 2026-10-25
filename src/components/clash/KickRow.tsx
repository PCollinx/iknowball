import { Football } from "./Football";

/** One kick: a football for scored, the same ball faded with a red stroke
 * through it for missed (Collins, 23 Oct 2026). Fills its box. */
export function Kick({ scored }: { scored: boolean }) {
  return (
    <span className="relative block size-full">
      <Football className={`size-full ${scored ? "" : "opacity-35"}`} />
      {!scored && (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="absolute inset-0 size-full">
          <path d="M3.5 20.5 L20.5 3.5" stroke="var(--color-red-card)" strokeWidth="3.2" strokeLinecap="round" />
        </svg>
      )}
    </span>
  );
}

/** The shootout row: every answer as a penalty. */
export function KickRow({ kicks, placeholder = false, size = "size-[22px]", className = "" }: { kicks: string; placeholder?: boolean; size?: string; className?: string }) {
  const right = [...kicks].filter((k) => k === "1").length;
  return (
    <ol className={`flex min-h-4.5 flex-wrap items-center gap-1 lg:gap-1.25 ${className}`} aria-label={`${right} scored, ${kicks.length - right} missed`}>
      {[...kicks].map((k, i) => (
        <li key={i} className={size}>
          <Kick scored={k === "1"} />
        </li>
      ))}
      {placeholder && !kicks.length && <li className="label text-navy/50">Your kicks go here</li>}
    </ol>
  );
}
