import Link from "next/link";
import { Suspense } from "react";
import { RatingBadge } from "@/components/profile/RatingBadge";
import { currentUserId } from "@/lib/daily/data";
import { getRating } from "@/lib/profile/data";
import { NavLinks, SectionLinks } from "./NavLinks";

// The site's navbar, "Programme" style (picked 20 Oct 2026): the shirt logo
// and wordmark, numbered sections like a matchday programme's contents, and
// your rating, over a double rule. On phones the sections sit in a row under
// the logo. It sits in the (site) layout, so every public screen has it, and
// it needs nothing from the page: the active section comes from the address
// and the rating loads in its own Suspense slot.
//
// Match mode (21 Oct 2026): while a timed round is on (a page renders
// <MatchLive />), CSS in globals.css hides the sections, the shirt link and
// the footer, and swaps the linked logo for a plain one, so a stray tap can't
// throw away an attempt. The data-nav-* attributes are its hooks.

export function SiteNav() {
  return (
    <header className="border-b-[4px] border-double border-navy">
      <div className="mx-auto flex max-w-[1184px] items-center justify-between gap-4 px-4 py-3 lg:py-0">
        <Link href="/" aria-label="iKnowBall home" data-nav-full className="flex items-center gap-2 lg:gap-2.5 lg:py-3">
          <Brand />
        </Link>
        {/* In match mode the mark is shown, not linked, so a stray tap can't leave the round. */}
        <span data-nav-brand className="items-center gap-2 lg:gap-2.5 lg:py-3">
          <Brand />
        </span>
        <nav aria-label="Sections" data-nav-full className="hidden gap-8 lg:flex">
          <Suspense fallback={<SectionLinks variant="desktop" className="pt-[22px] pb-5 text-[15px]" active={null} />}>
            <NavLinks variant="desktop" className="pt-[22px] pb-5 text-[15px]" />
          </Suspense>
        </nav>
        <div data-nav-full>
          <Suspense fallback={<ShirtLink rating={undefined} />}>
            <PlayerShirtLink />
          </Suspense>
        </div>
        <span data-nav-live className="label items-center gap-1.5 bg-navy px-2 py-1 text-white">
          <span className="h-2 w-2 rounded-full bg-red-card motion-safe:animate-pulse" aria-hidden="true" />
          Live
        </span>
      </div>
      <nav aria-label="Sections" data-nav-full className="flex gap-[18px] overflow-x-auto px-4 lg:hidden">
        <Suspense fallback={<SectionLinks variant="phone" className="pt-1 pb-2.5 text-sm" active={null} />}>
          <NavLinks variant="phone" className="pt-1 pb-2.5 text-sm" />
        </Suspense>
      </nav>
    </header>
  );
}

/** Reads the session, so it streams in after the page's static shell. */
async function PlayerShirtLink() {
  const me = await currentUserId();
  return <ShirtLink rating={me ? await getRating(me) : null} />;
}

/** `rating` is null before a first Daily, undefined while it loads (the link then reads "Your shirt"). */
function ShirtLink({ rating }: { rating: number | null | undefined }) {
  return (
    <Link href="/profile" aria-label="Your shirt" className="flex items-center gap-2.5 lg:border-2 lg:border-navy lg:py-1.5 lg:pr-3 lg:pl-2">
      {rating !== undefined && <RatingBadge rating={rating} className="w-[34px] text-base lg:w-[30px] lg:text-sm" />}
      <span className={`font-semibold ${rating !== undefined ? "hidden lg:inline" : "text-sm lg:text-base"}`}>Your shirt</span>
    </Link>
  );
}

function Brand() {
  return (
    <>
      <Logo />
      <span className="font-display text-[26px] leading-none uppercase lg:text-[32px]">
        iKnow<span className="text-royal">Ball</span>
      </span>
    </>
  );
}

/** A royal shirt with a 10 on it: the app's mark. */
export function Logo({ className = "h-[30px] w-[30px] lg:h-9 lg:w-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" className={className}>
      <path
        d="M50 9 Q45 9 41 5 L29 9 L7 23 L15 41 L25 36 L25 95 L75 95 L75 36 L85 41 L93 23 L71 9 L59 5 Q55 9 50 9 Z"
        fill="var(--color-royal)"
        stroke="var(--color-navy)"
        strokeWidth="5"
        strokeLinejoin="round"
      />
      <text x="50" y="72" textAnchor="middle" className="font-display" fontWeight="900" fontSize="40" fill="var(--color-teal-light)">
        10
      </text>
    </svg>
  );
}
