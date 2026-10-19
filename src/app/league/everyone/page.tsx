import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { LeagueLoading, LeagueMasthead } from "@/components/league/Masthead";
import { PlayerRanks, RankToggle } from "@/components/league/Ranks";
import { weekLabel } from "@/components/league/format";
import { getGlobalTable } from "@/lib/league/data";

export const metadata: Metadata = {
  title: "Everyone · The League · iKnowBall",
  description: "This week's global table. Best 5 Dailies and 3 Clash sprints count.",
};

export default function EveryonePage() {
  return (
    <Suspense fallback={<LeagueLoading />}>
      <Everyone />
    </Suspense>
  );
}

// Reads the session and the week, so it renders per request.
async function Everyone() {
  await connection();
  const { week, top, mine, players } = await getGlobalTable();
  return (
    <main className="mx-auto min-h-dvh max-w-[560px] px-4 pb-10">
      <LeagueMasthead right={weekLabel(week)} />
      <h1 className="mt-4 font-display text-[56px] leading-[0.9] uppercase">
        Every<span className="text-royal">one</span>
      </h1>
      <p className="mt-1.5 text-navy/75">
        {players.toLocaleString("en-GB")} {players === 1 ? "player" : "players"} this week. Best 5 Dailies and 3 Clash sprints count.
      </p>
      <RankToggle on="players" />
      {top.length ? (
        <PlayerRanks top={top} mine={mine} />
      ) : (
        <p className="mt-4 text-lg">Nobody has played this week yet. First on the table takes top spot.</p>
      )}
      {!top.some((r) => r.mine) && !mine && (
        <Link href="/daily" className="mt-4 block bg-royal p-3.5 text-center font-display text-[26px] text-white uppercase">
          Get on the table
        </Link>
      )}
    </main>
  );
}
