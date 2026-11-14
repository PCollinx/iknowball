// Match stats (Collins, 14 Nov 2026, option B of
// https://claude.ai/artifact/SZra89xUEceo8bAE28aHcH): full time's TV-style
// panel, a row a stat with your number on the left, the other side's on the
// right and a bar each from the middle. The Daily sets what you won against
// what got away; Clash sets you against your best this week or the mate whose
// challenge it is.

export type StatRow = { label: string; mine: number | string; theirs: number | string; mineShare: number; theirsShare: number };

/** A row with its bars as shares of `max` (nothing to show when max is 0). */
export function statRow(label: string, mine: number, theirs: number, max: number, show: { mine?: string; theirs?: string } = {}): StatRow {
  const share = (n: number) => (max > 0 ? Math.max(0, Math.min(1, n / max)) : 0);
  return { label, mine: show.mine ?? mine, theirs: show.theirs ?? theirs, mineShare: share(mine), theirsShare: share(theirs) };
}

const pct = (n: number) => `${Math.round(n * 100)}%`;

export function MatchStats({ rows, sides, against = "red", className = "" }: { rows: StatRow[]; sides: [string, string]; against?: "red" | "slate"; className?: string }) {
  const ink = against === "red" ? "text-red-card" : "text-slate";
  const bar = against === "red" ? "bg-red-card" : "bg-slate";
  return (
    <section aria-label="Match stats" className={`border-[3px] border-navy bg-white ${className}`}>
      <div className="flex items-center justify-between gap-3 border-b-[3px] border-navy bg-mist px-2.5 py-1.5 lg:px-3.5">
        <h2 className="font-display text-lg leading-none uppercase lg:text-xl">Match stats</h2>
        <span className="label text-[10px] lg:text-[11px]">
          {sides[0]} · {sides[1]}
        </span>
      </div>
      <ol>
        {rows.map((r) => (
          <li key={r.label} className="border-b border-track px-2.5 pt-2 pb-2.5 last:border-b-0 lg:px-3.5">
            <div className="grid grid-cols-[56px_minmax(0,1fr)_56px] items-baseline">
              <span className="font-display text-[22px] leading-none text-royal tabular-nums lg:text-2xl">{r.mine}</span>
              <span className="label text-center text-[10px] lg:text-[11px]">{r.label}</span>
              <span className={`text-right font-display text-[22px] leading-none tabular-nums lg:text-2xl ${ink}`}>{r.theirs}</span>
            </div>
            <div className="mt-1.5 grid grid-cols-2 gap-1" aria-hidden>
              <span className="flex h-[7px] justify-end bg-mist">
                <span className="block h-full bg-royal" style={{ width: pct(r.mineShare) }} />
              </span>
              <span className="flex h-[7px] bg-mist">
                <span className={`block h-full ${bar}`} style={{ width: pct(r.theirsShare) }} />
              </span>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
