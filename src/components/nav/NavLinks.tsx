"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// The navbar's numbered sections, from 00 Home: the welcome at /welcome,
// since / sends a player who has played straight to the Daily (src/proxy.ts).
// A client component only so it can read the address and mark the section
// you're in; everything else in the navbar renders on the server.

type Section = { key: string; href: string; label: string };

const HOME: Section = { key: "home", href: "/welcome", label: "Home" };
const DAILY: Section = { key: "daily", href: "/daily", label: "Daily" };
const CLASH: Section = { key: "clash", href: "/clash", label: "Clash" };
const LEAGUE: Section = { key: "league", href: "/league", label: "League" };
const TABLE: Section = { key: "table", href: "/daily/table", label: "Table" };
const PROFILE: Section = { key: "profile", href: "/profile", label: "Shirt" };

const SECTIONS = { desktop: [HOME, DAILY, CLASH, LEAGUE, TABLE], phone: [HOME, DAILY, CLASH, LEAGUE, PROFILE] };

/** The section an address belongs to: /daily/table is today's table, not the Daily. */
export function sectionOf(pathname: string): string | null {
  if (pathname === "/" || pathname === "/welcome") return "home";
  if (pathname === "/daily/table") return "table";
  for (const s of [DAILY, CLASH, LEAGUE, PROFILE]) {
    if (pathname === s.href || pathname.startsWith(`${s.href}/`)) return s.key;
  }
  return null;
}

/** The links with the current section marked. Reads the address, so SiteNav
 * wraps it in Suspense with <SectionLinks active={null} /> as the fallback. */
export function NavLinks({ variant, className }: { variant: "desktop" | "phone"; className: string }) {
  return <SectionLinks variant={variant} className={className} active={sectionOf(usePathname())} />;
}

export function SectionLinks({ variant, className, active }: { variant: "desktop" | "phone"; className: string; active: string | null }) {
  return SECTIONS[variant].map((s, i) => {
    const on = s.key === active;
    return (
      <Link
        key={s.key}
        href={s.href}
        aria-current={on ? "page" : undefined}
        className={`border-b-[3px] whitespace-nowrap ${on ? "border-teal font-semibold" : "border-transparent hover:border-track"} ${className}`}
      >
        <span className={on ? "text-royal" : ""}>{String(i).padStart(2, "0")}</span>&nbsp; {s.label}
      </Link>
    );
  });
}
