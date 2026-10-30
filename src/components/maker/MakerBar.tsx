import Link from "next/link";
import { signOut } from "@/app/maker/actions";

// The maker's masthead: the same printed-programme rule as The Daily. Every
// page shows the same links, the one you're on marked and not linked.

const PAGES = [
  ["days", "All days", "/maker"],
  ["jobs", "Jobs", "/maker/jobs"],
  ["lists", "Lists", "/maker/lists"],
  ["teaser", "Teasers", "/maker/teaser"],
] as const;

type Page = (typeof PAGES)[number][0];

export function MakerBar({ active, right }: { active?: Page; right?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 border-b border-navy pt-3.5 pb-2">
      <Link href="/maker" className="label">
        The Maker · Back office
      </Link>
      <nav aria-label="Maker" className="flex flex-wrap items-center gap-x-4 gap-y-1">
        {right}
        {PAGES.map(([key, name, href]) =>
          key === active ? (
            <span key={key} aria-current="page" className="label text-navy">
              {name}
            </span>
          ) : (
            <Link key={key} href={href} className="label text-navy/60 underline underline-offset-[3px]">
              {name}
            </Link>
          ),
        )}
        <form action={signOut}>
          <button type="submit" className="label text-navy/60 underline underline-offset-[3px]">
            Sign out
          </button>
        </form>
      </nav>
    </div>
  );
}
