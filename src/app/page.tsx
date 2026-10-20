import { Suspense } from "react";
import { connection } from "next/server";
import { splitFixture } from "@/components/daily/fixture";
import type { Kit } from "@/components/daily/ShirtBack";
import { ClashTicket } from "@/components/home/ClashTicket";
import { DailySticker } from "@/components/home/DailySticker";
import { LeagueBoard } from "@/components/home/LeagueBoard";
import { ShirtSticker } from "@/components/home/ShirtSticker";
import { SiteFooter } from "@/components/nav/SiteFooter";
import { SiteNav } from "@/components/nav/SiteNav";
import { getHomeClash } from "@/lib/clash/data";
import { currentUserId, getHomeDaily, type HomeDaily } from "@/lib/daily/data";
import { getHomeBoard } from "@/lib/league/data";
import { kitOf } from "@/lib/profile/club";
import { clubsNamed, getProfileView } from "@/lib/profile/data";
import { gameDate, gameDateClosesAt } from "@/lib/time";
import { KeepyUppy } from "@/components/loading/KeepyUppy";

// Home: "Matchday ticket" (picked 20 Oct 2026). The Daily as an album
// sticker, Clash as a match ticket, the League as a scoreboard and your shirt
// as a sticker, under the Programme navbar.

export default function Home() {
  return (
    <Suspense fallback={<Loading />}>
      <HomeScreen />
    </Suspense>
  );
}

/** Each of the fixture's clubs in its own kit; royal when a club isn't known. */
async function fixtureKits(daily: HomeDaily | null): Promise<[Kit | undefined, Kit | undefined]> {
  const title = daily?.parts.find((p) => p.part === 1)?.title;
  if (!title) return [undefined, undefined];
  const [home, away] = splitFixture(title);
  const clubs = await clubsNamed([home, away].filter((n): n is string => Boolean(n)));
  const kit = (name: string | null) => {
    const club = name ? clubs.get(name.toLowerCase()) : undefined;
    return club ? kitOf(club) : undefined;
  };
  return [kit(home), kit(away)];
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
  const [daily, clash, board, view] = await Promise.all([
    getHomeDaily(me),
    me ? getHomeClash(me) : null,
    getHomeBoard(me),
    me ? getProfileView(me) : null,
  ]);
  const kits = await fixtureKits(daily);
  const day = new Date(`${today}T12:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

  return (
    <>
      <SiteNav rating={view?.rating ?? null} />
      <main className="mx-auto max-w-[1184px] px-4 pb-8">
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

        <div className="mt-5 grid gap-7 lg:mt-6 lg:grid-cols-12 lg:gap-9">
          <div className="min-w-0 lg:col-span-7">
            <DailySticker daily={daily} kits={kits} closesAt={closesAt} serverNow={serverNow} />
          </div>
          <div className="flex min-w-0 flex-col gap-7 lg:col-span-5 lg:gap-8">
            <ClashTicket clash={clash} />
            <LeagueBoard tabs={board.tabs} club={board.club} />
          </div>
          <div className="px-1 lg:col-span-12 lg:px-0">
            <ShirtSticker view={view} />
          </div>
        </div>

      </main>
      <SiteFooter />
    </>
  );
}

function Loading() {
  return (
    <>
      <SiteNav />
      <main className="mx-auto min-h-[70dvh] max-w-[1184px] px-4" aria-busy="true">
        <KeepyUppy label="Matchday" caption="Warming up…" className="pt-16" />
      </main>
    </>
  );
}
