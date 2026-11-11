import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { BestCell } from "@/components/clash/Board";
import { BeatenBanner, ChallengeList } from "@/components/clash/Challenges";
import { ClashKickOff } from "@/components/clash/KickOff";
import { YourThree } from "@/components/clash/YourThree";
import { KeepyUppy } from "@/components/loading/KeepyUppy";
import { getChallenges, getHomeClash, type HomeClash } from "@/lib/clash/data";
import { statOfDay } from "@/lib/clash/rules";
import { currentUserId } from "@/lib/daily/data";
import { gameDate } from "@/lib/time";

export const metadata: Metadata = {
  title: "Clash · iKnowBall",
  description: "Sixty seconds of Higher or Lower. Send the link and settle it.",
};

export default function ClashPage() {
  return (
    <Suspense fallback={<KeepyUppy label="Clash" caption="Lining up the players…" />}>
      <KickOff />
    </Suspense>
  );
}

// Today's stat follows the clock, so the kick-off renders per request; your
// best, your three this week and your challenges stream in after it.
async function KickOff() {
  await connection();
  const me = currentUserId();
  const clash = me.then((id) => (id ? getHomeClash(id) : null));
  const challenges = me.then((id) => (id ? getChallenges(id) : []));
  return (
    <ClashKickOff
      stat={statOfDay(gameDate())}
      best={
        <Suspense fallback={<BestCell best={null} lastCode={null} />}>
          <Best clash={clash} />
        </Suspense>
      }
      three={
        <>
          <Suspense fallback={<YourThree three={[]} />}>
            <Three clash={clash} />
          </Suspense>
          <Suspense>
            <Challenges challenges={challenges} />
          </Suspense>
        </>
      }
    />
  );
}

async function Best({ clash }: { clash: Promise<HomeClash | null> }) {
  const c = await clash;
  return <BestCell best={c?.three[0] ?? null} lastCode={c?.lastCode ?? null} />;
}

/** Your challenges, led by the banner for one a friend has beaten since you
 * last looked (it was on home until home became the welcome, 11 Nov 2026). */
async function Challenges({ challenges }: { challenges: Promise<Awaited<ReturnType<typeof getChallenges>>> }) {
  const list = await challenges;
  const beaten = list.find((c) => c.news);
  return (
    <>
      {beaten && (
        <div className="mt-6">
          <BeatenBanner challenge={beaten} />
        </div>
      )}
      <ChallengeList challenges={list} />
    </>
  );
}

async function Three({ clash }: { clash: Promise<HomeClash | null> }) {
  return <YourThree three={(await clash)?.three ?? []} />;
}
