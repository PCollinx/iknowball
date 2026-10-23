import type { ReactNode } from "react";
import { ShirtBack, shirtName, type Kit } from "@/components/daily/ShirtBack";
import { PENALTY_SECONDS, SPRINT_SECONDS } from "@/lib/clash/rules";

// Clash's pieces from option E (picked 23 Oct 2026, docs/redesign-plan.md step 5):
// the head-to-head as two shirt stickers on an album page, the referee's notes
// as tilted stickers, and the "Higher or lower" heading as the call itself.

/** A mist album page with the stat as a tilted label sticker across its top edge. */
export function AlbumPage({ label, children, className = "" }: { label: string; children: ReactNode; className?: string }) {
  return (
    <section className={`relative border-2 border-navy bg-mist px-3 pt-7 pb-3.5 lg:px-7 lg:pt-9 lg:pb-5 ${className}`}>
      <span className="absolute -top-3 left-1/2 max-w-[92%] -translate-x-1/2 -rotate-2 truncate border-2 border-navy bg-teal-light px-2.5 py-0.5 font-display text-[17px] whitespace-nowrap uppercase shadow-[3px_3px_0_var(--color-navy)] lg:-top-4 lg:text-[22px]">
        {label}
      </span>
      {children}
    </section>
  );
}

/** Two slots side by side with the round "vs" sticker between them. */
export function Pair({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`relative grid grid-cols-2 gap-5 lg:gap-14 ${className}`}>
      {children}
      <span
        aria-hidden="true"
        className="absolute top-[42%] left-1/2 grid size-10.5 -translate-1/2 -rotate-6 place-items-center rounded-full border-2 border-white bg-navy font-display text-[19px] text-white uppercase shadow-[3px_3px_0_var(--color-sky)] lg:size-14.5 lg:border-[3px] lg:text-[26px] lg:shadow-[4px_4px_0_var(--color-sky)]"
      >
        vs
      </span>
    </div>
  );
}

export type StickerState = "idle" | "right" | "wrong" | "faded";

/** One player as a sticker: their club's shirt, the number on a tag (light teal
 * once known, white with "?" while hidden), and a stamp once called. */
export function PlayerSticker({ name, kit, value, side, state = "idle", pop = false }: { name: string; kit?: Kit; value: number | null; side: "left" | "right"; state?: StickerState; pop?: boolean }) {
  const called = state === "right" || state === "wrong";
  const ring = state === "right" ? "border-royal" : state === "wrong" ? "border-red-card" : "border-navy";
  const shadow =
    state === "right"
      ? "shadow-[7px_7px_0_var(--color-royal)] lg:shadow-[9px_9px_0_var(--color-royal)]"
      : state === "wrong"
        ? "shadow-[7px_7px_0_var(--color-red-card)] lg:shadow-[9px_9px_0_var(--color-red-card)]"
        : "shadow-[4px_4px_0_var(--color-navy)] lg:shadow-[5px_5px_0_var(--color-navy)]";
  const tilt = side === "left" ? "-rotate-2" : "rotate-2";
  const shown = value === null ? "?" : String(value);
  return (
    <span
      className={`relative grid min-w-0 justify-items-center gap-2 border-[2.5px] bg-white px-1.5 py-2.5 transition-[translate,box-shadow,opacity] duration-150 lg:gap-2.5 lg:border-[3px] lg:px-2.5 lg:py-3.5 ${ring} ${shadow} ${tilt} ${called ? "-translate-y-1.5 lg:-translate-y-2" : ""} ${state === "faded" ? "opacity-60" : ""}`}
    >
      <span className="block w-29 max-w-full lg:w-42.5">
        <ShirtBack kit={kit} name={shirtName(name)} num={shown} pop={pop} />
      </span>
      <span
        className={`min-w-14.5 border-2 border-navy px-3 text-center font-display text-[42px] leading-[1.05] tabular-nums lg:min-w-21 lg:border-[2.5px] lg:px-3.5 lg:text-[58px] ${value === null ? "bg-white" : "bg-teal-light"} ${side === "left" ? "rotate-2" : "-rotate-2"}`}
      >
        {shown}
      </span>
      <span className="label max-w-full truncate text-[9px] lg:text-xs">{name}</span>
      {called && (
        <span
          aria-hidden="true"
          className={`absolute top-[30%] left-1/2 -translate-x-1/2 -rotate-12 border-[3px] bg-white/90 px-2 font-display text-[26px] whitespace-nowrap uppercase lg:border-4 lg:px-3 lg:text-[40px] ${state === "right" ? "border-royal text-royal" : "border-red-card text-red-card"}`}
        >
          {state === "right" ? "Goal" : "Missed"}
        </span>
      )}
    </span>
  );
}

/** A slot on the album page: dashed, a shade deeper than the page. */
export function Slot({ children }: { children: ReactNode }) {
  return <div className="grid min-w-0 border-2 border-dashed border-[#8E9BD6] bg-[#E3E8FF] p-1.5 lg:border-[2.5px] lg:p-2.5">{children}</div>;
}

const NOTES = [
  { title: `${SPRINT_SECONDS} seconds`, line: "On our clock, not your phone's.", tone: "bg-teal-light", tilt: "-rotate-[1.2deg]" },
  { title: "Tap who has more", line: "Or Level if it's the same number.", tone: "bg-teal-light", tilt: "rotate-1 ml-3.5 lg:ml-5.5" },
  { title: `Miss, lose ${PENALTY_SECONDS} seconds`, line: "And your run starts again.", tone: "bg-red-card text-white", tilt: "-rotate-[0.6deg]" },
];

/** The rules as three tilted stickers (option B's, kept by Collins). */
export function RefereesNotes() {
  return (
    <section>
      <h2 className="label mb-2.5 text-[10px] lg:mb-3.5 lg:text-[11px]">The referee&apos;s notes</h2>
      <ol className="grid gap-2.5 lg:gap-4">
        {NOTES.map((n, i) => (
          <li
            key={n.title}
            className={`grid grid-cols-[32px_minmax(0,1fr)] items-center gap-2.5 border-[2.5px] border-navy px-2.5 py-2 shadow-[3px_3px_0_var(--color-navy)] lg:grid-cols-[44px_minmax(0,1fr)] lg:gap-3 lg:px-3.5 lg:py-3 lg:shadow-[4px_4px_0_var(--color-navy)] ${n.tilt}`}
          >
            <span className={`grid size-7.5 place-items-center rounded-full border-2 border-navy font-display text-lg lg:size-10.5 lg:text-2xl ${n.tone}`}>{i + 1}</span>
            <span className="text-sm lg:text-base">
              <b className="block font-display text-lg leading-none uppercase lg:text-[26px]">{n.title}</b>
              {n.line}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Arrow({ up }: { up: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`grid size-[0.62em] shrink-0 place-items-center border-[2.5px] border-navy ${up ? "-rotate-6 bg-teal-light shadow-[4px_4px_0_var(--color-navy)]" : "rotate-[5deg] bg-navy shadow-[4px_4px_0_var(--color-sky)]"}`}
    >
      <svg viewBox="0 0 24 24" className="size-[0.36em]">
        <path d={up ? "M12 3 L22 19 H2 Z" : "M12 21 L2 5 H22 Z"} fill={up ? "var(--color-navy)" : "var(--color-sky)"} />
      </svg>
    </span>
  );
}

/** "Higher or lower" as the call itself: Higher with an up sticker, a round
 * "or", Lower in royal with a down sticker (Collins's redesign, 23 Oct 2026). */
export function HigherOrLower({ className = "" }: { className?: string }) {
  return (
    <h1 className={`grid gap-1 font-display leading-[0.82] uppercase ${className}`}>
      <span className="flex items-center gap-[0.18em]">
        Higher <Arrow up />
      </span>
      <span className="flex items-center gap-[0.18em] pl-[0.64em]">
        <span className="grid size-[0.52em] shrink-0 -rotate-6 place-items-center rounded-full border-2 border-white bg-navy text-white shadow-[3px_3px_0_var(--color-sky)]">
          <span className="text-[0.22em] leading-none">or</span>
        </span>
        <span className="text-royal">Lower</span> <Arrow up={false} />
      </span>
    </h1>
  );
}
