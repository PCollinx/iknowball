import type { ReactNode } from "react";

// The team sheet (Collins, 7 Nov 2026, picked from
// https://claude.ai/artifact/1MZkQVXFfGhncyPtg59TX4): the form the ref signs
// before kick-off, in place of the rows of tilted stickers. One ruled box, a
// mist strip with its name, and rows printed straight with a royal rule on
// the left (red for a warning). Used by the gaffer's instructions, the team
// talk, the referee's notes, the full-time ratings, Clash's full time and the
// numbers on Your shirt.

export type SheetRow = {
  title: ReactNode;
  text?: ReactNode;
  /** A number or badge on the right, after a dotted leader (player ratings). */
  value?: ReactNode;
  /** A warning: the rule and title in red. */
  warn?: boolean;
  /** The row on navy, for the one that sums it up (Overall). */
  dark?: boolean;
};

export function TeamSheet({ name, tag, rows, className = "" }: { name: string; tag?: string; rows: SheetRow[]; className?: string }) {
  return (
    <section aria-label={name} className={`border-[3px] border-navy bg-white ${className}`}>
      <div className="flex items-center justify-between gap-3 border-b-[3px] border-navy bg-mist px-2.5 py-1.5">
        <h2 className="label text-[10px] lg:text-[11px]">{name}</h2>
        {tag && <span className="label text-[10px] text-teal lg:text-[11px]">{tag}</span>}
      </div>
      <ol>
        {rows.map((r, i) => (
          <li
            key={i}
            className={`flex items-center gap-2.5 border-b border-navy border-l-[6px] px-2.5 py-2 last:border-b-0 lg:px-3.5 lg:py-2.5 ${
              r.warn ? "border-l-red-card" : "border-l-royal"
            } ${r.dark ? "bg-navy text-white" : ""}`}
          >
            <span className="min-w-0 flex-1">
              <span className="flex items-baseline gap-1.5">
                <span className={`font-display text-lg leading-none uppercase lg:text-[22px] ${r.warn ? "text-red-card" : ""}`}>{r.title}</span>
                {r.value !== undefined && (
                  <span aria-hidden="true" className={`flex-1 -translate-y-1 border-b-2 border-dotted ${r.dark ? "border-slate" : "border-track"}`} />
                )}
              </span>
              {r.text && <span className={`mt-0.5 block text-[13px] leading-snug lg:text-sm ${r.dark ? "text-white/80" : "text-slate"}`}>{r.text}</span>}
            </span>
            {r.value !== undefined && <span className="shrink-0">{r.value}</span>}
          </li>
        ))}
      </ol>
    </section>
  );
}

/** A value on the sheet's right: a number or word in the display face. */
export function SheetValue({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <span className={`font-display text-[26px] leading-none uppercase tabular-nums lg:text-[30px] ${className}`}>{children}</span>;
}
