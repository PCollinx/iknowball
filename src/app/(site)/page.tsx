import { Suspense } from "react";
import { connection } from "next/server";
import { ClashTicket } from "@/components/home/ClashTicket";
import { DailySticker } from "@/components/home/DailySticker";
import { LeagueBoard } from "@/components/home/LeagueBoard";
import { ShirtSticker } from "@/components/home/ShirtSticker";
import { BeatenBanner } from "@/components/clash/Challenges";
import { getChallenges, getHomeClash } from "@/lib/clash/data";
import { statOfDay } from "@/lib/clash/rules";
import { clashSample, SAMPLE_CHALLENGES, SAMPLE_MONDAY } from "@/lib/clash/sample";
import { currentUserId, getHomeDaily } from "@/lib/daily/data";
import { getHomeBoard } from "@/lib/league/data";
import { getProfileView, kitsForFixture } from "@/lib/profile/data";
import { gameDate, gameDateClosesAt } from "@/lib/time";
import { KeepyUppy } from "@/components/loading/KeepyUppy";

// Home: "Matchday ticket" (picked 20 Oct 2026). The Daily as an album
// sticker, Clash as a match ticket, the League as a scoreboard and your shirt
// as a sticker, under the Programme navbar.

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default function Home({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<Loading />}>
      <HomeScreen searchParams={searchParams} />
    </Suspense>
  );
}

/** The game date and the server's clock, for the countdown to midnight WAT. */
function readClock() {
  const today = gameDate();
  return { today, closesAt: gameDateClosesAt(today).toISOString(), serverNow: Date.now() };
}

// Reads the session and the clock, so it renders per request.
async function HomeScreen({ searchParams }: { searchParams: SearchParams }) {
  await connection();
  const [me, params] = await Promise.all([currentUserId(), searchParams]);
  // Test sites: ?sample=challenges or ?sample=monday (see src/lib/clash/sample.ts).
  const sample = clashSample(params.sample);
  const { today, closesAt, serverNow } = readClock();
  const [daily, real, board, view, found] = await Promise.all([
    getHomeDaily(me),
    me ? getHomeClash(me) : null,
    getHomeBoard(me),
    me ? getProfileView(me) : null,
    me ? getChallenges(me) : [],
  ]);
  const clash = sample === "monday" && real ? { ...real, ...SAMPLE_MONDAY } : real;
  const challenges = sample === "challenges" ? SAMPLE_CHALLENGES : found;
  // A challenge of yours that a mate beat since you last looked: the banner at the top.
  const beaten = challenges.find((c) => c.news);
  const kits = await kitsForFixture(daily?.parts.find((p) => p.part === 1)?.title ?? null);
  const day = new Date(`${today}T12:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

  return (
    <>
      <main className="mx-auto w-full max-w-[1184px] px-4 pb-8">
        <div className="pt-4 lg:pt-6">
          <span className="label text-royal">{day}</span>
          <h1 className="mt-1 font-display text-[40px] leading-[0.9] uppercase lg:text-[60px] lg:leading-[0.86]">
            {daily ? (
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

        <div className="mt-5 grid gap-7 lg:mt-6 lg:grid-cols-12 lg:gap-9">
          <div className="min-w-0 lg:col-span-7">
            <DailySticker daily={daily} kits={kits} closesAt={closesAt} serverNow={serverNow} />
          </div>
          <div className="flex min-w-0 flex-col gap-7 lg:col-span-5 lg:gap-8">
            <ClashTicket clash={clash} stat={statOfDay(today)} />
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
