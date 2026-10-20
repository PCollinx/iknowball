import { ShirtBack } from "@/components/daily/ShirtBack";
import { RatingBadge } from "@/components/profile/RatingBadge";
import { kitOf } from "@/lib/profile/club";
import type { ProfileView } from "@/lib/profile/data";
import { nextTier, PLACEMENT_DAYS } from "@/lib/profile/stats";
import { Sticker } from "./Sticker";

// Your shirt on the home page: a sideways sticker with the shirt, rating,
// tier and how far off the next tier you are. On desktop it runs the full
// width with this week's numbers.

export function ShirtSticker({ view }: { view: ProfileView | null }) {
  if (!view || (view.rating === null && !view.username)) {
    return (
      <Sticker href="/daily" className="-rotate-[0.6deg] [animation-delay:400ms] motion-safe:animate-deal-sticker">
        <div className="flex items-center gap-3 p-2.5 lg:gap-6 lg:px-[18px] lg:py-3">
          <div className="w-[86px] shrink-0 lg:w-24">
            <ShirtBack state="empty" num="?" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="label text-royal">04 · Your shirt</span>
            <div className="mt-0.5 font-display text-[30px] leading-[0.9] uppercase lg:text-[40px]">No shirt yet</div>
            <p className="mt-1 text-[13px] lg:text-sm">Play today&apos;s Daily and you get one. No sign-up needed.</p>
          </div>
        </div>
      </Sticker>
    );
  }

  const next = view.rating !== null && view.tier ? nextTier(view.rating) : null;
  const toPlace = PLACEMENT_DAYS - view.daysPlayed;
  const progress = view.tier ? (next?.progress ?? 1) : Math.min(1, view.daysPlayed / PLACEMENT_DAYS);
  const line = view.tier
    ? next
      ? `${next.gap.toFixed(1)} off ${next.name}`
      : "Top of the game"
    : `${toPlace} more ${toPlace === 1 ? "Daily" : "Dailies"} to get placed`;

  return (
    <Sticker href="/profile" className="-rotate-[0.6deg] [animation-delay:400ms] motion-safe:animate-deal-sticker">
      <div className="flex items-center gap-3 p-2.5 lg:gap-6 lg:px-[18px] lg:py-3">
        <div className="relative w-[86px] shrink-0 @container lg:w-24">
          <ShirtBack kit={kitOf(view.club)} lettering="tag" name={view.username ?? "Guest"} num={view.tier ?? "Unplaced"} />
          <RatingBadge rating={view.rating} className="absolute -top-1.5 -right-2 w-[30px] border-2 border-white text-[13px] lg:w-[34px] lg:text-sm" />
        </div>
        <div className="min-w-0 flex-1 lg:max-w-[300px]">
          <span className="label text-royal">04 · Your shirt</span>
          <div className="mt-0.5 mb-1.5 truncate font-display text-[30px] leading-[0.9] uppercase lg:mt-1 lg:mb-2 lg:text-[40px]">{view.tier ?? "Unplaced"}</div>
          <div className="h-1.5 bg-track lg:h-2" aria-hidden="true">
            <div className="h-full origin-left bg-teal motion-safe:animate-fill-bar" style={{ width: `${progress * 100}%` }} />
          </div>
          <p className="mt-1 text-[13px] lg:mt-1.5 lg:text-sm">
            {line}
            <span className="lg:hidden">{` · ${view.streak}-day streak`}</span>
          </p>
        </div>
        <dl className="hidden flex-1 justify-around lg:flex">
          <Figure label="Streak" value={view.streak === 1 ? "1 day" : `${view.streak} days`} />
          <Figure label="This week" value={`${view.weekScore}`} />
          <Figure label="Leagues" value={`${view.leagues.length}`} />
        </dl>
        <span aria-hidden="true" className="btn-teal hidden px-3 pb-0.5 font-display text-[22px] uppercase lg:inline-block">
          Open →
        </span>
      </div>
    </Sticker>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col-reverse">
      <dt className="label text-navy/75">{label}</dt>
      <dd className="font-display text-[34px] leading-none uppercase tabular-nums">{value}</dd>
    </div>
  );
}
