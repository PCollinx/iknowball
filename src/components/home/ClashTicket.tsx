import Link from "next/link";
import { PENALTY_SECONDS, SET_SIZE, SPRINT_SECONDS } from "@/lib/clash/rules";
import type { HomeClash } from "@/lib/clash/data";

// Clash on the home page: a match ticket (picked 20 Oct 2026). The stub
// rocks as if it's about to be torn off, and carries your latest challenge
// code when you have one. The head-to-head is a fixed example of a call.

const SHIRT = "M50 9 Q45 9 41 5 L29 9 L7 23 L15 41 L25 36 L25 95 L75 95 L75 36 L85 41 L93 23 L71 9 L59 5 Q55 9 50 9 Z";

export function ClashTicket({ clash }: { clash: HomeClash | null }) {
  return (
    <article className="relative grid rotate-[0.8deg] grid-cols-[minmax(0,1fr)_80px] min-[380px]:grid-cols-[minmax(0,1fr)_96px] border-[3px] border-navy bg-white shadow-[5px_5px_0_var(--color-navy)] [animation-delay:150ms] motion-safe:animate-deal-sticker lg:grid-cols-[minmax(0,1fr)_120px] lg:shadow-[7px_7px_0_var(--color-navy)]">
      <div className="p-3 pl-3.5 lg:p-4 lg:pl-[18px]">
        <div className="label flex justify-between text-[10px] lg:text-[11px]">
          <span>Admit one · Clash</span>
          <span className="text-royal">{SET_SIZE} players</span>
        </div>
        <h2 className="mt-1 mb-2 font-display text-[30px] leading-[0.9] uppercase lg:mt-1.5 lg:mb-2.5 lg:text-[40px]">
          Higher <span className="sash-mark">or</span> lower
        </h2>
        {/* Each player is a stack (shirt, number, name) on small phones and a row from 380px, so nothing is squeezed. */}
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1.5 border-[1.5px] border-navy bg-mist px-2 py-1.5 min-[400px]:gap-2 lg:gap-2.5 lg:px-2.5 lg:py-2">
          <div className="flex min-w-0 flex-col items-center gap-1 text-center min-[400px]:flex-row min-[400px]:gap-2 min-[400px]:text-left">
            <MiniShirt num="9" />
            <span className="min-w-0 leading-none">
              <span className="block font-display text-[22px] lg:text-[28px]">260</span>
              <span className="label block truncate text-[9px] lg:text-[10px]">Shearer</span>
            </span>
          </div>
          <span className="sash-mark font-display text-base uppercase lg:text-xl">vs</span>
          <div className="flex min-w-0 flex-col items-center gap-1 text-center min-[400px]:flex-row-reverse min-[400px]:gap-2 min-[400px]:text-right">
            <MiniShirt num="10" />
            <span className="min-w-0 leading-none">
              <span className="block font-display text-[22px] text-royal lg:text-[28px]">?</span>
              <span className="label block truncate text-[9px] lg:text-[10px]">Rooney</span>
            </span>
          </div>
        </div>
        <p className="mt-2 mb-2.5 text-[13px] lg:mt-2.5 lg:mb-3 lg:text-[15px]">
          League goals or games for a club. A miss costs {PENALTY_SECONDS} seconds.
          {clash?.best != null && (
            <>
              {" "}
              Your best this week: <b>{clash.best}</b>.
            </>
          )}
        </p>
        <Link
          href="/clash"
          className="btn-navy btn-press mr-1.5 block p-2 text-center font-display text-[22px] uppercase lg:p-2.5 lg:text-2xl"
        >
          Kick off →
        </Link>
      </div>

      <div className="flex origin-bottom-left flex-col items-center justify-between border-l-[3px] border-dashed border-navy bg-teal px-1.5 py-3 text-navy motion-safe:animate-tear lg:px-2 lg:py-4">
        <span className="label text-[9px] lg:text-[10px]">Seconds</span>
        <span className="font-display text-[54px] leading-[0.85] lg:text-[76px]">{SPRINT_SECONDS}</span>
        {clash?.lastCode ? (
          <Link href={`/clash/${clash.lastCode}`} className="flex flex-col items-center gap-1.5 text-center">
            <span className="bg-navy px-1.5 py-0.5 font-display text-[13px] tracking-[0.08em] text-white lg:text-[15px]">{clash.lastCode}</span>
            <span className="border-b-2 border-navy font-display text-base leading-tight uppercase lg:text-[19px]">Your challenge ↗</span>
          </Link>
        ) : (
          <span className="text-center font-display text-base leading-tight uppercase lg:text-[19px]">Then dare a mate</span>
        )}
      </div>

      {/* The notches where the stub tears off. */}
      <span aria-hidden="true" className="absolute -top-3 right-[69px] min-[380px]:right-[85px] h-5 w-5 rounded-full border-[3px] border-navy bg-white [clip-path:inset(50%_0_0_0)] lg:right-[109px]" />
      <span aria-hidden="true" className="absolute right-[69px] -bottom-3 min-[380px]:right-[85px] h-5 w-5 rounded-full border-[3px] border-navy bg-white [clip-path:inset(0_0_50%_0)] lg:right-[109px]" />
    </article>
  );
}

function MiniShirt({ num }: { num: string }) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" className="h-[34px] w-[34px] shrink-0 lg:h-11 lg:w-11">
      <path d={SHIRT} fill="#fff" stroke="var(--color-navy)" strokeWidth="5" strokeLinejoin="round" />
      <text x="50" y="70" textAnchor="middle" className="font-display" fontWeight="900" fontSize="40" fill="var(--color-royal)">
        {num}
      </text>
    </svg>
  );
}
