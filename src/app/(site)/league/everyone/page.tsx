import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { ShareButtons } from "@/components/daily/ShareButtons";
import { LeagueLoading, LeagueMasthead } from "@/components/league/Masthead";
import { SeasonTable } from "@/components/league/LeaguePage";
import { Bench, RankToggle, TeamOfTheWeek, YourSpot } from "@/components/league/Ranks";
import { ShownWeek } from "@/components/league/ShownWeek";
import { WeekStrip } from "@/components/league/WeekStrip";
import { weekLabel } from "@/components/league/format";
import { publicEnv } from "@/lib/env";
import { getGlobalTable } from "@/lib/league/data";
import { dayIndex, teamOfTheWeek, XI } from "@/lib/league/standing";
import { Arrow } from "@/components/icons/Icon";

export const metadata: Metadata = {
  title: "Team of the week · The League · iKnowBall",
  description: "This week's top 11 make the team. Best 5 Dailies and 3 Clash sprints count, out of 600.",
};

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

type Search = Promise<{ w?: string }>;

export default function EveryonePage({ searchParams }: { searchParams: Search }) {
  return (
    <Suspense fallback={<LeagueLoading />}>
      <Everyone searchParams={searchParams} />
    </Suspense>
  );
}

// Reads the session and the week, so it renders per request.
async function Everyone({ searchParams }: { searchParams: Search }) {
  await connection();
  const { w } = await searchParams;
  const { week, top, mine, myClub, players, strip, shown, season, seasonPlace } = await getGlobalTable(w);
  const live = shown.kind === "week" && !shown.final;
  const { xi, bench } = teamOfTheWeek(top);
  const me = mine ?? top.find((r) => r.mine) ?? null;
  const eleventh = xi[XI - 1]?.points ?? null;
  return (
    <main className="mx-auto w-full max-w-[560px] flex-1 px-4 pb-10 lg:max-w-[1040px]">
      <LeagueMasthead back right={weekLabel(week)} />
      <div className="lg:grid lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:gap-12">
        <div className="min-w-0">
          <span className="label mt-3.5 block text-[10px] text-royal lg:mt-[18px] lg:text-[11px]">
            {shown.kind === "season"
              ? "The season"
              : `${players.toLocaleString("en-GB")} ${players === 1 ? "player" : "players"}${live ? ` · ${WEEKDAYS[dayIndex(week.startsOn, week.today)]}` : ""}`}
          </span>
          <h1 className="mt-0.5 font-display text-[42px] leading-[0.86] uppercase lg:text-[50px]">
            Team of the week
          </h1>
          <p className="mt-1.5 text-slate">The top 11 make the team. Best 5 Dailies and 3 sprints count, out of 600.</p>
          <div className="mt-3.5 lg:hidden">
            <RankToggle on="players" />
          </div>
          <WeekStrip base="/league/everyone" weeks={strip} selected={shown.kind === "season" ? "season" : (shown.n ?? 0)} seasonPlace={seasonPlace} />
          <ShownWeek shown={shown} today={week.today} />
          <div className="mt-3">
            {shown.kind === "season" ? (
              season.length ? (
                <SeasonTable rows={season} captainId="" />
              ) : (
                <p className="border-2 border-dashed border-track px-3 py-4 text-center text-sm text-slate">Nobody has scored this season yet.</p>
              )
            ) : (
              <TeamOfTheWeek xi={xi} />
            )}
          </div>
        </div>
        <aside className="mt-3.5 grid grid-cols-[minmax(0,1fr)] content-start gap-[22px] lg:mt-[18px]">
          <div className="hidden lg:block">
            <RankToggle on="players" />
          </div>
          {shown.kind === "week" && <Bench rows={bench} />}
          {shown.kind === "week" && <YourSpot mine={me} club={myClub} eleventh={xi.every(Boolean) ? eleventh : null} players={players} />}
          {live && xi[0] && (
            <ShareButtons
              text={`This week's team of the week on iKnowBall. Think you know ball? Make the XI: ${publicEnv().NEXT_PUBLIC_SITE_URL.replace(/\/$/, "")}/league/everyone`}
              image={{ url: "/league/everyone/card", name: "iknowball-team-of-the-week.png" }}
              className="mt-0"
            />
          )}
          {live && !me?.points && (
            <Link href="/daily" className="btn-navy btn-press justify-self-start px-4 py-2.5 font-display text-[22px] leading-none uppercase">
              Play today&apos;s Daily <Arrow />
            </Link>
          )}
        </aside>
      </div>
    </main>
  );
}
