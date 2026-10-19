import { Football } from "./Football";

/** The shootout row: every answer as a penalty, a football for scored, a red cross for missed. */
export function KickRow({ kicks, placeholder = false, className = "" }: { kicks: string; placeholder?: boolean; className?: string }) {
  const right = [...kicks].filter((k) => k === "1").length;
  return (
    <ol className={`flex min-h-[26px] flex-wrap items-center gap-[5px] ${className}`} aria-label={`${right} scored, ${kicks.length - right} missed`}>
      {[...kicks].map((k, i) =>
        k === "1" ? (
          <li key={i}>
            <Football className="size-[22px]" />
          </li>
        ) : (
          <li key={i} className="grid size-[22px] place-items-center rounded-full border-2 border-red-card font-display text-base leading-none text-red-card">
            ×
          </li>
        ),
      )}
      {placeholder && !kicks.length && <li className="label text-navy/50">Your kicks go here</li>}
    </ol>
  );
}
