import type { ReactNode } from "react";
import { KeepyUppy } from "@/components/loading/KeepyUppy";
import { clock } from "./clock";

// Pieces shared by the Daily's rounds in play (step 2 of docs/redesign-plan.md,
// Collins's mix of 21 Oct 2026): the clock box, the progress boxes and the pitch.

/** The clock: a teal box with a hard shadow, red near the end. */
export function RoundClock({ left, low, className = "" }: { left: number; low: boolean; className?: string }) {
  return (
    <div
      role="timer"
      aria-label={`${left} seconds left`}
      className={`border-[2.5px] border-navy px-2.5 pt-0.5 pb-1 text-right text-white shadow-[3px_3px_0_var(--color-navy)] lg:px-4 lg:pb-1.5 ${low ? "bg-red-card" : "bg-teal"} ${className}`}
    >
      <span className="label block text-[9px] lg:text-[11px]">Time left</span>
      <span className="block font-display text-[42px] leading-[0.9] tabular-nums lg:text-6xl">{clock(left)}</span>
    </div>
  );
}

/** A round's heading: what's being played, the title, the clock and the task. */
export function RoundHead({ label, title, prompt, left, low }: { label: string; title: ReactNode; prompt: string; left: number; low: boolean }) {
  return (
    <div>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2.5 pt-3 lg:pt-6">
        <div className="@container min-w-0">
          <span className="label block text-[10px] text-royal lg:text-xs">{label}</span>
          <div className="mt-0.5">{title}</div>
        </div>
        <RoundClock left={left} low={low} />
      </div>
      <p className="mt-2 text-sm leading-snug lg:mt-3 lg:text-lg">{prompt}</p>
    </div>
  );
}

export type Step = "right" | "wrong" | "now" | "next";

const STEP_TONE: Record<Step, string> = {
  right: "border-royal bg-royal",
  wrong: "border-red-card bg-red-card",
  now: "border-navy bg-teal-light",
  next: "border-track",
};

/** A box a question or slot: right in royal, wrong in red, the current one light teal. */
export function Steps({ steps, label, children }: { steps: Step[]; label: string; children?: ReactNode }) {
  return (
    <div className="flex items-center gap-2.5">
      <ol className="flex flex-1 gap-[3px]" aria-label={label}>
        {steps.map((s, i) => (
          <li key={i} aria-label={`${i + 1}: ${s === "next" ? "to come" : s === "now" ? "now" : s}`} className={`h-[9px] flex-1 border-[1.5px] ${STEP_TONE[s]}`} />
        ))}
      </ol>
      {children && <span className="label shrink-0 text-[10px] lg:text-xs">{children}</span>}
    </div>
  );
}

/** A half pitch in mist with track lines; children are placed on it in %. */
export function Pitch({ half, className = "", children }: { half: "attack" | "middle"; className?: string; children: ReactNode }) {
  return (
    <div className={`@container relative overflow-hidden border-[2.5px] border-navy bg-mist ${className}`}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden className="absolute inset-0 h-full w-full">
        {[0, 25, 50, 75].map((y) => (
          <rect key={y} x="0" y={y} width="100" height="12.5" fill="var(--color-track)" opacity="0.45" />
        ))}
        <g fill="none" stroke="#9aa6c8" strokeWidth="2" vectorEffect="non-scaling-stroke">
          {half === "attack" ? (
            <>
              <rect x="25" y="79" width="50" height="21" vectorEffect="non-scaling-stroke" />
              <rect x="39" y="92" width="22" height="8" vectorEffect="non-scaling-stroke" />
            </>
          ) : (
            <>
              <line x1="0" y1="50" x2="100" y2="50" vectorEffect="non-scaling-stroke" />
              <rect x="25" y="0" width="50" height="16" vectorEffect="non-scaling-stroke" />
              <rect x="25" y="84" width="50" height="16" vectorEffect="non-scaling-stroke" />
            </>
          )}
        </g>
      </svg>
      {/* The centre circle stays round whatever the pitch's shape. */}
      <span
        aria-hidden
        className={`absolute left-1/2 size-[26cqw] -translate-1/2 rounded-full border-2 border-[#9aa6c8] lg:size-[20cqw] ${half === "attack" ? "top-0" : "top-1/2"}`}
      />
      {children}
    </div>
  );
}

/** "Give up and reveal", the same on every round. */
export function GiveUp({ onClick, disabled }: { onClick: () => void; disabled: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className="shrink-0 text-[13px] font-semibold text-navy/70 underline underline-offset-[3px]">
      Give up and reveal
    </button>
  );
}

/** Which whistle ends a part: half-time after Part 1, full time after Part 2. */
export type Whistle = "half" | "full";

const WHISTLE = {
  half: { label: "Half-time", caption: "Dressing room…" },
  full: { label: "Full time", caption: "Counting the goals…" },
} as const;

/** Covers the round from the moment a part ends until the next screen arrives,
 * so the gap reads as the whistle, not a frozen page. */
export function WhistleCover({ whistle }: { whistle: Whistle }) {
  const { label, caption } = WHISTLE[whistle];
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-white/95">
      <KeepyUppy label={label} caption={caption} />
    </div>
  );
}
