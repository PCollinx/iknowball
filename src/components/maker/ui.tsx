// The maker's shared pieces (redesign, 31 Oct 2026): a page's heading, the
// body's width and the state chips. No server code, so the day and list
// editors (client components) can use them too.

/** A maker page's heading: the name, a line on what it's for, and its tools on the right. */
export function MakerHead({ title, crumb, children, tools }: { title: React.ReactNode; crumb?: React.ReactNode; children?: React.ReactNode; tools?: React.ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3 border-b-[3px] border-double border-navy pt-5 pb-2.5">
      <div className="min-w-0">
        {crumb && <span className="label text-slate">{crumb}</span>}
        <h1 className="font-display text-4xl leading-[0.88] uppercase sm:text-[44px]">{title}</h1>
        {children && <p className="mt-1 max-w-[60ch] text-sm text-slate">{children}</p>}
      </div>
      {tools && <div className="flex flex-wrap items-center gap-2">{tools}</div>}
    </div>
  );
}

/** The page body under the bar. */
export const MAKER_MAIN = "mx-auto w-full max-w-[1200px] px-4 pb-12 lg:px-8";

export type ChipKind = "live" | "scheduled" | "draft" | "empty" | "auto" | "ok" | "warning" | "failed" | "running" | "plain";

const CHIP: Record<ChipKind, string> = {
  live: "border-teal bg-teal text-white",
  scheduled: "border-royal bg-royal text-white",
  draft: "border-navy bg-white",
  empty: "border-dashed border-red-card text-red-card",
  auto: "border-navy bg-teal-light",
  ok: "border-navy bg-teal-light",
  warning: "border-red-card bg-white text-red-card",
  failed: "border-red-card bg-red-card text-white",
  running: "border-navy bg-navy text-sky",
  plain: "border-navy bg-white",
};

/** A small state label: Live, Scheduled, Draft, Empty, Auto, or a job's result. */
export function Chip({ kind, children }: { kind: ChipKind; children: React.ReactNode }) {
  return <span className={`inline-block border-2 px-1.5 text-[10px] font-semibold tracking-[0.06em] whitespace-nowrap uppercase ${CHIP[kind]}`}>{children}</span>;
}
