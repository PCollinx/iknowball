import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { JoinLeague, StartLeague } from "@/components/league/Forms";
import { EmptyBoard, LeagueAlbum, TableStickers } from "@/components/league/Hub";
import { LeagueLoading, LeagueMasthead } from "@/components/league/Masthead";
import { weekLabel } from "@/components/league/format";
import { getHub } from "@/lib/league/data";

export const metadata: Metadata = {
  title: "The League · iKnowBall",
  description: "Mini-leagues with your friends, scored every matchweek. Best 5 Dailies and 3 Clash sprints count.",
};

export default function LeaguePage() {
  return (
    <Suspense fallback={<LeagueLoading />}>
      <Hub />
    </Suspense>
  );
}

// Reads the session and the week, so it renders per request.
async function Hub() {
  await connection();
  const hub = await getHub();
  const first = hub.leagues.length === 0;

  return (
    <main className="mx-auto w-full max-w-[560px] flex-1 px-4 pb-10 lg:max-w-[1040px]">
      <LeagueMasthead right={weekLabel(hub.week)} />
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-11">
        <div className="min-w-0">
          <h1 className="mt-3.5 font-display text-[60px] leading-[0.84] uppercase lg:mt-[18px] lg:text-[84px]">
            Your <span className="sash-mark">leagues</span>
          </h1>
          <p className="mt-2 text-sm lg:mt-2.5 lg:text-[15px]">
            {first
              ? "Mini-leagues with your friends, scored Monday to Sunday. Your best 5 Dailies and best 3 sprints count."
              : "Your best 5 Dailies and best 3 sprints count. Tables lock Sunday at midnight."}
          </p>
          <div className="mt-[18px] lg:mt-5">
            {first ? (
              <section aria-label="Your first league" className="grid grid-cols-[minmax(0,1fr)] gap-4 border-2 border-navy bg-mist px-3 pt-4 pb-[18px] lg:px-[18px] lg:pt-5">
                <EmptyBoard />
                <StartLeague look="slot" n={1} note="You get a code for the group chat · up to 50" />
                <JoinLeague look="slot" n={2} note="The IKB code a friend sent" />
              </section>
            ) : (
              <LeagueAlbum leagues={hub.leagues} />
            )}
          </div>
        </div>

        <aside className="mt-[22px] grid grid-cols-[minmax(0,1fr)] content-start gap-[22px] lg:mt-7">
          <TableStickers everyone={hub.everyone} club={hub.club} fanbase={hub.fanbase} />
          {first ? (
            <Link href="/daily" className="btn-navy btn-press block p-2.5 text-center font-display text-2xl uppercase">
              Play today&apos;s Daily →
            </Link>
          ) : (
            <div id="start" className="grid scroll-mt-4 grid-cols-[minmax(0,1fr)] gap-3.5">
              <StartLeague />
              <JoinLeague />
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}
