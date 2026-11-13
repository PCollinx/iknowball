import Link from "next/link";
import { handoffHeading, SPRINT_SECONDS, STATS, type Stat } from "@/lib/clash/rules";
import { Arrow } from "@/components/icons/Icon";

// Extra time (Collins, 2 Nov 2026, option B of the "Clash after the Daily"
// mocks): a ticket pinned to the foot of full time, so Clash is one tap away
// however far down the report you are. Players missed the hand-off at the bottom.

export function ExtraTime({ three, stat }: { three: number[]; stat: Stat }) {
  return (
    <div data-extra-time className="fixed inset-x-0 bottom-0 z-20 border-t-2 border-navy bg-white pt-2.5 pb-[max(14px,env(safe-area-inset-bottom))]">
      <div className="mx-auto flex w-full max-w-[560px] justify-end px-3 lg:max-w-[1280px] lg:px-8">
        <Link
          href="/clash"
          className="btn-teal btn-press grid min-h-[60px] w-full grid-cols-[minmax(0,1fr)_84px] lg:w-[480px]"
          aria-label={`Extra time: a ${SPRINT_SECONDS}-second Clash sprint. ${STATS[stat].ask} ${handoffHeading(three)}`}
        >
          <span className="grid content-center gap-[3px] px-3 py-2">
            <span className="label truncate text-navy">Extra time · Clash · {STATS[stat].ask}</span>
            <span className="truncate font-display text-[24px] leading-[0.9] uppercase">{handoffHeading(three)}</span>
          </span>
          <span className="flex items-center justify-center gap-1.5 border-l-[2.5px] border-dashed border-navy bg-navy font-display text-[22px] text-teal-light uppercase">
            {SPRINT_SECONDS}s <Arrow />
          </span>
        </Link>
      </div>
    </div>
  );
}
