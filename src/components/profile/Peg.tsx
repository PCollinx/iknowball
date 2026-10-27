import Link from "next/link";
import { ordinal } from "@/components/daily/formats";
import { ShirtBack } from "@/components/daily/ShirtBack";
import type { HubLine } from "@/lib/league/data";
import { kitOf } from "@/lib/profile/club";
import type { ProfileView } from "@/lib/profile/data";
import { formatRating, RATING_DAYS } from "@/lib/profile/rating";
import { nextTier, PLACEMENT_DAYS } from "@/lib/profile/stats";
import { RatingBadge } from "./RatingBadge";

// Your shirt as "The dressing-room peg" (option A, picked 27 Oct 2026, with
// B's stat stickers, league stickers and section heads): the shirt hangs on
// your peg, the stats are four stickers, the settings sections under double rules.

/** The rail and the peg, with the shirt (or an empty one) hanging from it. */
function Rail({ children }: { children: React.ReactNode }) {
  return (
    <section className="relative mt-4 border-2 border-navy bg-mist pt-[30px] pb-[18px]">
      <span aria-hidden="true" className="absolute inset-x-0 top-3.5 h-2.5 bg-navy" />
      <span aria-hidden="true" className="absolute top-2 left-1/2 size-[22px] -translate-x-1/2 rounded-full border-[3px] border-navy bg-track" />
      {children}
    </section>
  );
}

export function Peg({ view }: { view: ProfileView }) {
  const name = view.username ?? "Guest";
  return (
    <Rail>
      <div className="relative mx-auto mt-3.5 w-[72%] max-w-[300px] -rotate-[1.5deg] @container lg:w-[70%]">
        <ShirtBack kit={kitOf(view.club)} lettering="tag" name={name} num={view.tier ?? "Unplaced"} />
        <RatingBadge rating={view.rating} className="absolute -top-1.5 -right-2.5 w-[24cqw] border-[1cqw] text-[11cqw]" />
      </div>
    </Rail>
  );
}

export function EmptyPeg() {
  return (
    <Rail>
      <div className="mx-auto mt-3.5 w-[60%] max-w-[240px]">
        <ShirtBack state="empty" num="?" />
      </div>
      <p className="mt-2.5 text-center font-display text-[22px] uppercase">An empty peg</p>
    </Rail>
  );
}

function Sticker({ label, value, sub, className }: { label: string; value: string; sub: string; className: string }) {
  return (
    <div className={`border-[3px] border-navy px-2.5 py-2 shadow-[4px_4px_0_var(--color-navy)] ${className}`}>
      <span className="label block">{label}</span>
      <span className="mt-0.5 block font-display text-[32px] leading-[0.95] uppercase tabular-nums">{value}</span>
      <span className="mt-0.5 block text-xs opacity-80">{sub}</span>
    </div>
  );
}

/** Rating, tier (or placement), streak and this week, as four stickers. */
export function StatStickers({ view }: { view: ProfileView }) {
  const left = PLACEMENT_DAYS - view.daysPlayed;
  const next = view.rating !== null ? nextTier(view.rating) : null;
  return (
    <section aria-label="Your numbers" className="mt-5 grid grid-cols-2 gap-x-3 gap-y-3.5">
      <Sticker label="Rating" value={formatRating(view.rating)} sub={`Out of 10, last ${RATING_DAYS} days`} className="-rotate-1 bg-white" />
      {view.tier ? (
        <Sticker
          label="Tier"
          value={view.tier}
          sub={next && view.rating !== null ? `${next.name} at ${(view.rating + next.gap).toFixed(1)}` : "The top tier"}
          className="rotate-[0.8deg] bg-teal text-white"
        />
      ) : (
        <Sticker
          label="Placement"
          value={`${view.daysPlayed} of ${PLACEMENT_DAYS}`}
          sub={`${left} more ${left === 1 ? "Daily" : "Dailies"}`}
          className="rotate-[0.8deg] bg-white"
        />
      )}
      <Sticker
        label="Streak"
        value={view.streak === 1 ? "1 day" : `${view.streak} days`}
        sub={view.streak ? "Days in a row" : "Play today to start one"}
        className="rotate-[0.5deg] bg-navy text-white"
      />
      <Sticker
        label="This week"
        value={String(view.weekScore)}
        sub={`/ 600 · ${view.weekClash ? `+${view.weekClash} Clash` : `${view.weekDays} played`}`}
        className="-rotate-[0.6deg] bg-teal-light"
      />
    </section>
  );
}

const TILTS = ["-rotate-1", "rotate-[0.8deg]", "-rotate-[0.4deg]"];

/** Your leagues as small stickers: your place this week, the name on the royal band, how many play. */
export function LeagueStickers({ leagues }: { leagues: HubLine[] }) {
  if (!leagues.length) {
    return (
      <>
        <p>No leagues yet. Start one and send the code to your mates.</p>
        <Link href="/league" className="btn-navy btn-press mt-3 inline-block px-4 py-2 font-display text-xl uppercase">
          The League →
        </Link>
      </>
    );
  }
  return (
    <ul className="grid grid-cols-3 gap-2.5">
      {leagues.map((l, i) => (
        <li key={l.league.id}>
          <Link
            href={`/league/${l.league.invite_code}`}
            className={`block border-[3px] border-navy bg-white shadow-[3px_3px_0_var(--color-navy)] transition-[rotate,translate] duration-150 hover:-translate-y-1 hover:rotate-0 ${TILTS[i % TILTS.length]}`}
          >
            <span className="block px-2 pt-1.5 pb-0.5 font-display text-[40px] leading-[0.9]">{l.position ? ordinal(l.position) : "–"}</span>
            <span className="block truncate bg-royal px-2 py-1 font-display text-sm text-white uppercase">{l.league.name}</span>
            <span className="label block px-2 py-1 text-[9px]">
              {l.members} {l.members === 1 ? "player" : "players"}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** A section of the settings: the heading over a double rule. */
export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6 lg:first:mt-0">
      <h2 className="border-b-4 border-double border-navy pb-1.5 font-display text-[30px] leading-none uppercase">{title}</h2>
      <div className="mt-2.5">{children}</div>
    </section>
  );
}
