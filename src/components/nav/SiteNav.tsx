import Link from "next/link";
import { RatingBadge } from "@/components/profile/RatingBadge";

// The site's navbar, "Programme" style (picked 20 Oct 2026): the shirt logo
// and wordmark, numbered sections like a matchday programme's contents, and
// your rating, over a double rule. On phones the sections sit in a row under
// the logo.

export type Section = "daily" | "clash" | "league" | "table" | "profile";

const DESKTOP: [Section, string, string][] = [
  ["daily", "/daily", "The Daily"],
  ["clash", "/clash", "Clash"],
  ["league", "/league", "The League"],
  ["table", "/daily/table", "Today's table"],
];
const PHONE: [Section, string, string][] = [...DESKTOP.slice(0, 3), ["profile", "/profile", "Your shirt"]];

/** `rating` is the player's rating, null before a first Daily; leave it out on
 * pages that don't look it up, and the link reads "Your shirt" instead. */
export function SiteNav({ active, rating }: { active?: Section; rating?: number | null }) {
  return (
    <header className="border-b-[4px] border-double border-navy">
      <div className="mx-auto flex max-w-[1184px] items-center justify-between gap-4 px-4 py-3 lg:py-0">
        <Link href="/" aria-label="iKnowBall home" className="flex items-center gap-2 lg:gap-2.5">
          <Logo />
          <span className="font-display text-[26px] leading-none uppercase lg:text-[32px]">
            iKnow<span className="text-royal">Ball</span>
          </span>
        </Link>
        <nav aria-label="Sections" className="hidden gap-8 lg:flex">
          {DESKTOP.map(([key, href, label], i) => (
            <NavLink key={key} href={href} n={i + 1} label={label} active={active === key} className="pt-[22px] pb-5 text-[15px]" />
          ))}
        </nav>
        <Link
          href="/profile"
          aria-label="Your shirt"
          className="flex items-center gap-2.5 lg:border-2 lg:border-navy lg:py-1.5 lg:pr-3 lg:pl-2"
        >
          {rating !== undefined && <RatingBadge rating={rating} className="w-[34px] text-base lg:w-[30px] lg:text-sm" />}
          <span className={`font-semibold ${rating !== undefined ? "hidden lg:inline" : "text-sm lg:text-base"}`}>Your shirt</span>
        </Link>
      </div>
      <nav aria-label="Sections" className="flex gap-[18px] overflow-x-auto px-4 lg:hidden">
        {PHONE.map(([key, href, label], i) => (
          <NavLink key={key} href={href} n={i + 1} label={label} active={active === key} className="pt-1 pb-2.5 text-sm" />
        ))}
      </nav>
    </header>
  );
}

function NavLink({ href, n, label, active, className }: { href: string; n: number; label: string; active: boolean; className: string }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`border-b-[3px] whitespace-nowrap ${active ? "border-teal font-semibold" : "border-transparent hover:border-track"} ${className}`}
    >
      <span className={active ? "text-royal" : ""}>{String(n).padStart(2, "0")}</span>&nbsp; {label}
    </Link>
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
