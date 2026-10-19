/** The shootout row: every answer as a penalty, scored in royal, missed as a red cross. */
export function KickRow({ kicks, placeholder = false, className = "" }: { kicks: string; placeholder?: boolean; className?: string }) {
  const right = [...kicks].filter((k) => k === "1").length;
  return (
    <ol className={`flex min-h-[26px] flex-wrap items-center gap-[5px] ${className}`} aria-label={`${right} scored, ${kicks.length - right} missed`}>
      {[...kicks].map((k, i) =>
        k === "1" ? (
          <li key={i} className="size-[22px] rounded-full border-2 border-royal bg-royal" />
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
