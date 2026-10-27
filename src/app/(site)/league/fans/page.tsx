import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { isTestSite } from "@/lib/daily/sample";
import { ShirtBack } from "@/components/daily/ShirtBack";
import { LeagueLoading, LeagueMasthead } from "@/components/league/Masthead";
import { AwayEnd, Gate, RankToggle } from "@/components/league/Ranks";
import { weekLabel } from "@/components/league/format";
import { getFanbaseTable } from "@/lib/league/data";
import { isFansPreview, previewFans } from "@/lib/league/sample";
import { dayIndex } from "@/lib/league/standing";

export const metadata: Metadata = {
  title: "The away end · The League · iKnowBall",
  description: "Which club's fans know ball? Clubs ranked by their fans' average week, out of 600.",
};

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function FansPage({ searchParams }: PageProps<"/league/fans">) {
  return (
    <Suspense fallback={<LeagueLoading />}>
      <Fans searchParams={searchParams} />
    </Suspense>
  );
}

// Reads the session and the week, so it renders per request.
async function Fans({ searchParams }: Pick<PageProps<"/league/fans">, "searchParams">) {
  await connection();
  // Test sites only: ?preview= shows sample data (src/lib/league/sample.ts).
  const preview = (await searchParams).preview;
  const { week, rows, myClub, myClubFans, minFans } = await (isTestSite() && isFansPreview(preview) ? previewFans(preview) : getFanbaseTable());
  const placed = rows.some((r) => r.mine);
  return (
    <main className="mx-auto w-full max-w-[560px] flex-1 px-4 pb-10 lg:max-w-[1040px]">
      <LeagueMasthead back right={weekLabel(week)} />
      <div className="lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-12">
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-[22px]">
          <div>
            <span className="label mt-3.5 block text-[10px] text-royal lg:mt-[18px] lg:text-[11px]">
              {rows.length} {rows.length === 1 ? "club" : "clubs"} on the table · {WEEKDAYS[dayIndex(week.startsOn, week.today)]}
            </span>
            <h1 className="mt-0.5 font-display text-[52px] leading-[0.86] uppercase lg:text-[64px]">
              The away <span className="sash-mark">end</span>
            </h1>
            <p className="mt-1.5 text-slate">
              Clubs by their fans&apos; average week, out of 600. A club needs {minFans} fans playing to get through the gate.
            </p>
            <div className="mt-3.5">
              <RankToggle on="fans" />
            </div>
          </div>
          {myClub && !placed && <Gate club={myClub} fans={myClubFans} minFans={minFans} />}
          {!myClub && (
            <Link href="/profile" className="grid grid-cols-[44px_minmax(0,1fr)] items-center gap-2.5 border-2 border-dashed border-[#8E9BD6] p-3 hover:bg-mist">
              <ShirtBack state="empty" num="?" />
              <span>
                <span className="label block text-[10px] text-royal">Your club&apos;s fans</span>
                <span className="block font-display text-2xl leading-none uppercase">Pick a club to play for its fans →</span>
              </span>
            </Link>
          )}
        </div>
        <div className="mt-[22px] lg:mt-[18px]">
          {rows.length ? (
            <AwayEnd rows={rows} />
          ) : (
            <p className="border-y-4 border-double border-navy py-3 text-lg">
              Nobody&apos;s through the gate yet: no club has {minFans} fans playing this week. Get your lot on it.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
