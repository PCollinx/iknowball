import { Suspense } from "react";
import { WhistleStrip } from "@/components/push/WhistleStrip";
import { connection } from "next/server";
import { ClashTicket } from "@/components/home/ClashTicket";
import { DailySticker } from "@/components/home/DailySticker";
import { LeagueBoard } from "@/components/home/LeagueBoard";
import { ShirtSticker } from "@/components/home/ShirtSticker";
import { BeatenBanner } from "@/components/clash/Challenges";
import { getChallenges, getHomeClash } from "@/lib/clash/data";
import { statOfDay } from "@/lib/clash/rules";
import { currentUserId, getHomeDaily } from "@/lib/daily/data";
import { getHomeBoard } from "@/lib/league/data";
import { getProfileView, kitsForFixture } from "@/lib/profile/data";
import { gameDate, gameDateClosesAt } from "@/lib/time";
import { KeepyUppy } from "@/components/loading/KeepyUppy";

// Home: "Matchday ticket" (picked 20 Oct 2026). The Daily as an album
// sticker, Clash as a match ticket, the League as a scoreboard and your shirt
// as a sticker, under the Programme navbar. Once today's Daily is done and you
// haven't sprinted today, Clash takes the Daily's place at the top (Collins,
// 2 Nov 2026, option D of the "Clash after the Daily" mocks).

export default function Home() {
  return (
    <Suspense fallback={<Loading />}>
      <HomeScreen />
    </Suspense>
  );
}

/** The game date and the server's clock, for the countdown to midnight WAT. */
function readClock() {
  const today = gameDate();
  return { today, closesAt: gameDateClosesAt(today).toISOString(), serverNow: Date.now() };
}

// Reads the session and the clock, so it renders per request.
async function HomeScreen() {
  await connection();
  const me = await currentUserId();
  const { today, closesAt, serverNow } = readClock();
  const [daily, clash, board, view, challenges] = await Promise.all([
    getHomeDaily(me),
    me ? getHomeClash(me) : null,
    getHomeBoard(me),
    me ? getProfileView(me) : null,
    me ? getChallenges(me) : [],
  ]);
  // A challenge of yours that a mate beat since you last looked: the banner at the top.
  const beaten = challenges.find((c) => c.news);
  const kits = await kitsForFixture(daily?.parts.find((p) => p.part === 1)?.title ?? null);
  const clashFirst = daily?.status === "done" && clash !== null && !clash.playedToday;
  const dailySticker = <DailySticker daily={daily} kits={kits} closesAt={closesAt} serverNow={serverNow} />;
  const clashTicket = <ClashTicket clash={clash} stat={statOfDay(today)} />;
  const day = new Date(`${today}T12:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

  return (
    <>
      <main className="mx-auto w-full max-w-[1184px] px-4 pb-8">
        <div className="pt-4 lg:pt-6">
          <span className="label text-royal">{day}</span>
          <h1 className="mt-1 font-display text-[40px] leading-[0.9] uppercase lg:text-[60px] lg:leading-[0.86]">
            {clashFirst ? (
              <>
                Daily done.{" "}
                <span className="btn-teal ml-1 inline-block -rotate-2 px-2.5 pb-1 lg:ml-2 lg:px-3.5 lg:pb-1.5">Clash is on</span>
              </>
            ) : daily ? (
              <>
                Matchday{" "}
                <span className="btn-teal ml-1 inline-block -rotate-2 px-2.5 pb-1 lg:ml-2 lg:px-3.5 lg:pb-1.5">is on</span>
              </>
            ) : (
              <>
                Rest{" "}
                <span className="btn-teal ml-1 inline-block -rotate-2 px-2.5 pb-1 lg:ml-2 lg:px-3.5 lg:pb-1.5">day</span>
              </>
            )}
          </h1>
        </div>

        {beaten && (
          <div className="mt-5 lg:mt-6">
            <BeatenBanner challenge={beaten} />
          </div>
        )}

        {/* The installed app's first opens: one tap to the whistle (option A). */}
        <WhistleStrip guest={false} installedOnly className="mt-5 lg:mt-6 lg:max-w-[560px]" />

        <div className="mt-5 grid gap-7 lg:mt-6 lg:grid-cols-12 lg:gap-9">
          <div className="min-w-0 lg:col-span-7">
            {clashFirst ? clashTicket : dailySticker}
          </div>
          <div className="flex min-w-0 flex-col gap-7 lg:col-span-5 lg:gap-8">
            {clashFirst ? dailySticker : clashTicket}
            <LeagueBoard tabs={board.tabs} club={board.club} />
          </div>
          <div className="px-1 lg:col-span-12 lg:px-0">
            <ShirtSticker view={view} />
          </div>
        </div>

      </main>
    </>
  );
}

function Loading() {
  return (
    <>
      <main className="mx-auto w-full max-w-[1184px] flex-1 px-4" aria-busy="true">
        <KeepyUppy label="Matchday" caption="Warming up…" className="pt-16" />
      </main>
    </>
  );
}
