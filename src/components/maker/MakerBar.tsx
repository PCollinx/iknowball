import Link from "next/link";
import { signOut } from "@/app/maker/actions";
import { shortDate } from "@/components/daily/Masthead";
import { Logo } from "@/components/nav/SiteNav";
import { JOB_NAMES } from "@/lib/control/problems";
import { createAdminClient } from "@/lib/supabase/admin";
import { addDays, gameDate } from "@/lib/time";

export { Chip, MAKER_MAIN, MakerHead, type ChipKind } from "./ui";

// The maker's bar (redesign, Collins, 31 Oct 2026, mocks at
// https://claude.ai/artifact/7fYaL9vEK1xQvVEHgEUFW6): navy, the shirt mark and
// a tab per page, the one you're on underlined in light teal. Days carries a
// red count of the next seven days not yet scheduled; Jobs carries OK, or a red
// count of jobs whose last run had problems. On phones the tabs sit behind a
// Menu button.

const PAGES = [
  ["days", "Days", "/maker"],
  ["lists", "Lists", "/maker/lists"],
  ["clash", "Clash", "/maker/clash"],
  ["jobs", "Jobs", "/maker/jobs"],
  ["teaser", "Teasers", "/maker/teaser"],
] as const;

export type MakerPageName = (typeof PAGES)[number][0];

/** Days in the next seven (today on) that aren't fully scheduled, and jobs whose last run had problems. */
async function counts(): Promise<{ days: number; jobs: number }> {
  const admin = createAdminClient();
  const today = gameDate();
  const dates = Array.from({ length: 7 }, (_, i) => addDays(today, i));
  const [dailies, runs] = await Promise.all([
    admin.from("dailies").select("play_date, status").gte("play_date", dates[0]).lte("play_date", dates[6]),
    admin.from("job_runs").select("job, status").order("started_at", { ascending: false }).limit(60),
  ]);
  if (dailies.error) throw dailies.error;
  if (runs.error) throw runs.error;
  const ready = (date: string) => {
    const parts = (dailies.data ?? []).filter((d) => d.play_date === date);
    return parts.length > 0 && parts.every((p) => p.status === "scheduled");
  };
  const last = JOB_NAMES.map((job) => (runs.data ?? []).find((r) => r.job === job)?.status);
  return { days: dates.filter((d) => !ready(d)).length, jobs: last.filter((s) => s === "warning" || s === "failed").length };
}

function Badge({ n, ok }: { n: number; ok?: string }) {
  if (n === 0 && !ok) return null;
  return <span className={`px-1.5 font-display text-[13px] leading-[1.35] ${n ? "bg-red-card text-white" : "bg-teal text-white"}`}>{n || ok}</span>;
}

export async function MakerBar({ active }: { active?: MakerPageName }) {
  const { days, jobs } = await counts();
  const badge = { days: <Badge n={days} />, jobs: <Badge n={jobs} ok="OK" /> } as Partial<Record<MakerPageName, React.ReactNode>>;
  const tabs = (className: string) =>
    PAGES.map(([key, name, href]) => (
      <Link key={key} href={href} aria-current={key === active ? "page" : undefined} className={className}>
        {name}
        {badge[key]}
      </Link>
    ));

  return (
    <header className="relative bg-navy text-white">
      <div className="mx-auto flex max-w-[1200px] items-stretch px-4 lg:px-8">
        <Link href="/maker" className="flex items-center gap-2 border-r border-slate py-2.5 pr-3.5 whitespace-nowrap md:mr-1.5">
          <Logo className="h-[26px]" />
          <span className="font-display text-xl tracking-[0.02em] uppercase">
            The <span className="text-teal-light">Maker</span>
          </span>
        </Link>

        <nav aria-label="Maker" className="hidden items-stretch md:flex">
          {tabs(
            "flex items-center gap-1.5 border-b-[3px] border-transparent px-3 text-sm font-semibold whitespace-nowrap text-white/70 hover:text-white aria-[current=page]:border-teal-light aria-[current=page]:text-white",
          )}
        </nav>

        <div className="ml-auto hidden items-center gap-3.5 pl-3.5 text-[13px] whitespace-nowrap md:flex">
          <span className="font-display text-base text-teal-light">{shortDate(gameDate())}</span>
          <Link href="/" className="text-white/70 hover:text-white">
            Site ↗
          </Link>
          <SignOut />
        </div>

        {/* Phones: the tabs behind a Menu button (Collins, 31 Oct 2026). */}
        <details className="group ml-auto flex items-center md:hidden">
          <summary className="flex cursor-pointer list-none items-center gap-2 py-2.5 pl-3 font-display text-lg uppercase [&::-webkit-details-marker]:hidden">
            {days + jobs > 0 && <span className="size-2.5 rounded-full bg-red-card" aria-hidden="true" />}
            <span className="group-open:hidden">Menu</span>
            <span className="hidden group-open:inline">Close</span>
            <span aria-hidden="true" className="grid gap-[3px]">
              <span className="block h-[2.5px] w-[18px] bg-teal-light" />
              <span className="block h-[2.5px] w-[18px] bg-teal-light" />
              <span className="block h-[2.5px] w-[18px] bg-teal-light" />
            </span>
          </summary>
          <div className="absolute inset-x-0 top-full z-30 border-t border-slate bg-navy px-4 pb-4 shadow-[0_6px_0_var(--color-teal-light)]">
            <nav aria-label="Maker" className="grid">
              {tabs(
                "flex items-center justify-between gap-2 border-b border-slate py-3 font-display text-2xl uppercase aria-[current=page]:text-teal-light",
              )}
            </nav>
            <div className="mt-3 flex items-center justify-between text-sm">
              <span className="font-display text-base text-teal-light">{shortDate(gameDate())}</span>
              <Link href="/" className="text-white/70">
                Site ↗
              </Link>
              <SignOut />
            </div>
          </div>
        </details>
      </div>
    </header>
  );
}

function SignOut() {
  return (
    <form action={signOut}>
      <button type="submit" className="text-white/70 underline underline-offset-[3px] hover:text-white">
        Sign out
      </button>
    </form>
  );
}
