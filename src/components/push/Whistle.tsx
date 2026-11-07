import type { ReactNode } from "react";

// The whistle's pieces (Collins, 7 Nov 2026, options A, B and C of
// https://claude.ai/artifact/AGqN4hg5iztkWXatKnGwab): the ref's whistle and
// the small dashed strip both prompts sit in.

/** The ref's whistle: light teal with a navy edge and three red blasts. */
export function WhistleMark({ className = "size-[42px]" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={`shrink-0 ${className}`} aria-hidden="true">
      <path d="M6 30 h22 v-8 h8 v8 h4 a16 16 0 1 1 -16 16 h-18 z" fill="var(--color-teal-light)" stroke="var(--color-navy)" strokeWidth="4" strokeLinejoin="round" />
      <circle cx="40" cy="46" r="6" fill="var(--color-navy)" />
      <path d="M30 12 l3 -7 M40 13 l6 -6 M22 15 l-3 -7" stroke="var(--color-red-card)" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

/** The strip: dashed, mist, the whistle on the left. */
export function WhistleStripFrame({ title, line, children, label }: { title: string; line: ReactNode; children?: ReactNode; label: string }) {
  return (
    <section aria-label={label} className="flex items-start gap-3 border-[3px] border-dashed border-navy bg-mist px-3 py-2.5">
      <WhistleMark />
      <div className="min-w-0 flex-1">
        <h2 className="font-display text-[22px] leading-[0.95] uppercase">{title}</h2>
        <div className="mt-0.5 text-[13px] leading-snug text-slate">{line}</div>
        {children}
      </div>
    </section>
  );
}

/** A small teal sticker button, as on the strip. */
export function StripButton({ onClick, children, disabled = false }: { onClick: () => void; children: ReactNode; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="btn-teal btn-press flex items-center gap-4 px-2.5 pt-1 pb-0.5 font-display text-[17px] uppercase disabled:opacity-60"
    >
      <span>{children}</span>
      <span aria-hidden="true">→</span>
    </button>
  );
}

/** A switch: a navy square that slides right onto light teal. */
export function WhistleSwitch({ on, onChange, label }: { on: boolean; onChange: (on: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={`relative h-[30px] w-[58px] shrink-0 border-[3px] border-navy shadow-[2px_2px_0_var(--color-navy)] ${on ? "bg-teal-light" : "bg-white"}`}
    >
      <span className={`absolute top-[2px] size-5 bg-navy motion-safe:transition-[left] ${on ? "left-[30px]" : "left-[2px]"}`} />
    </button>
  );
}
