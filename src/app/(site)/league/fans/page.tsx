import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { LeagueLoading, LeagueMasthead } from "@/components/league/Masthead";
import { FanRanks, RankToggle } from "@/components/league/Ranks";
import { weekLabel } from "@/components/league/format";
import { isTestSite } from "@/lib/daily/sample";
import { getFanbaseTable } from "@/lib/league/data";
import { isRankPreview, previewFans } from "@/lib/league/sample";

export const metadata: Metadata = {
  title: "Fanbase · The League · iKnowBall",
  description: "Which club's fans know ball? Clubs ranked by their fans' average week.",
};

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
  // Test sites only: ?preview=1 shows sample rankings.
  const sample = isTestSite() && isRankPreview((await searchParams).preview);
  const { week, rows, myClub, minFans } = await (sample ? previewFans() : getFanbaseTable());
  const placed = rows.some((r) => r.mine);
  return (
    <main className="mx-auto w-full flex-1 max-w-[560px] px-4 pb-10">
      <LeagueMasthead href={sample ? "/league?preview=hub" : "/league"} right={weekLabel(week)} />
      <h1 className="mt-4 font-display text-[56px] leading-[0.9] uppercase">
        Fan<span className="text-royal">base</span>
      </h1>
      <p className="mt-1.5 text-navy/75">Clubs by their fans&apos; average week, out of 600. A club needs {minFans} fans playing to make the table.</p>
      <RankToggle on="fans" preview={sample} />
      {rows.length ? (
        <FanRanks rows={rows} />
      ) : (
        <p className="mt-4 text-lg">No club has {minFans} fans playing yet this week. Get your lot on it.</p>
      )}
      {myClub && !placed && (
        <p className="mt-4 border-l-[3px] border-teal pl-3 text-[15px]">
          {myClub.name} aren&apos;t on the table yet: they need {minFans} fans playing this week.
        </p>
      )}
      {!myClub && (
        <p className="mt-4 text-[15px]">
          Pick a club on your{" "}
          <Link href="/profile" className="font-semibold text-royal underline underline-offset-2">
            profile
          </Link>{" "}
          to play for its fans.
        </p>
      )}
    </main>
  );
}
