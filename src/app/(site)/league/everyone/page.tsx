import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { isTestSite } from "@/lib/daily/sample";
import { ShareButtons } from "@/components/daily/ShareButtons";
import { LeagueLoading, LeagueMasthead } from "@/components/league/Masthead";
import { Bench, RankToggle, TeamOfTheWeek, YourSpot } from "@/components/league/Ranks";
import { weekLabel } from "@/components/league/format";
import { publicEnv } from "@/lib/env";
import { getGlobalTable } from "@/lib/league/data";
import { isEveryonePreview, previewEveryone } from "@/lib/league/sample";
import { dayIndex, teamOfTheWeek, XI } from "@/lib/league/standing";

export const metadata: Metadata = {
  title: "Team of the week · The League · iKnowBall",
  description: "This week's top 11 make the team. Best 5 Dailies and 3 Clash sprints count, out of 600.",
};

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function EveryonePage({ searchParams }: PageProps<"/league/everyone">) {
  return (
    <Suspense fallback={<LeagueLoading />}>
      <Everyone searchParams={searchParams} />
    </Suspense>
  );
}

// Reads the session and the week, so it renders per request.
async function Everyone({ searchParams }: Pick<PageProps<"/league/everyone">, "searchParams">) {
  await connection();
  // Test sites only: ?preview= shows sample data (src/lib/league/sample.ts).
  const preview = (await searchParams).preview;
  const sample = isTestSite() && isEveryonePreview(preview) ? preview : null;
  const { week, top, mine, myClub, players } = await (sample ? previewEveryone(sample) : getGlobalTable());
  const { xi, bench } = teamOfTheWeek(top);
  const me = mine ?? top.find((r) => r.mine) ?? null;
  const eleventh = xi[XI - 1]?.points ?? null;
  return (
    <main className="mx-auto w-full max-w-[560px] flex-1 px-4 pb-10 lg:max-w-[1040px]">
      <LeagueMasthead back right={weekLabel(week)} />
      <div className="lg:grid lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:gap-12">
        <div className="min-w-0">
          <span className="label mt-3.5 block text-[10px] text-royal lg:mt-[18px] lg:text-[11px]">
            {players.toLocaleString("en-GB")} {players === 1 ? "player" : "players"} · {WEEKDAYS[dayIndex(week.startsOn, week.today)]}
          </span>
          <h1 className="mt-0.5 font-display text-[52px] leading-[0.86] uppercase lg:text-[64px]">
            Team of the <span className="sash-mark">week</span>
          </h1>
          <p className="mt-1.5 text-slate">The top 11 make the team. Best 5 Dailies and 3 sprints count, out of 600.</p>
          <div className="mt-3.5 lg:hidden">
            <RankToggle on="players" />
          </div>
          <div className="mt-4">
            <TeamOfTheWeek xi={xi} />
          </div>
        </div>
        <aside className="mt-3.5 grid grid-cols-[minmax(0,1fr)] content-start gap-[22px] lg:mt-[18px]">
          <div className="hidden lg:block">
            <RankToggle on="players" />
          </div>
          <Bench rows={bench} />
          <YourSpot mine={me} club={myClub} eleventh={xi.every(Boolean) ? eleventh : null} players={players} />
          {xi[0] && (
            <ShareButtons
              text={`This week's team of the week on iKnowBall. Think you know ball? Make the XI: ${publicEnv().NEXT_PUBLIC_SITE_URL.replace(/\/$/, "")}/league/everyone`}
              image={{ url: `/league/everyone/card${sample ? `?preview=${sample}` : ""}`, name: "iknowball-team-of-the-week.png" }}
              className="mt-0"
            />
          )}
          {!me?.points && (
            <Link href="/daily" className="btn-navy btn-press justify-self-start px-4 py-2.5 font-display text-[22px] leading-none uppercase">
              Play today&apos;s Daily →
            </Link>
          )}
        </aside>
      </div>
    </main>
  );
}
