import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { BestCell } from "@/components/clash/Board";
import { ChallengeList } from "@/components/clash/Challenges";
import { ClashKickOff } from "@/components/clash/KickOff";
import { YourThree } from "@/components/clash/YourThree";
import { KeepyUppy } from "@/components/loading/KeepyUppy";
import { getChallenges, getHomeClash, type HomeClash } from "@/lib/clash/data";
import { clashSample, SAMPLE_CHALLENGES } from "@/lib/clash/sample";
import { statOfDay } from "@/lib/clash/rules";
import { currentUserId } from "@/lib/daily/data";
import { gameDate } from "@/lib/time";

export const metadata: Metadata = {
  title: "Clash · iKnowBall",
  description: "Sixty seconds of Higher or Lower. Send the link and settle it.",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default function ClashPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<KeepyUppy label="Clash" caption="Lining up the players…" />}>
      <KickOff searchParams={searchParams} />
    </Suspense>
  );
}

// Today's stat follows the clock, so the kick-off renders per request; your
// best, your three this week and your challenges stream in after it.
async function KickOff({ searchParams }: { searchParams: SearchParams }) {
  await connection();
  // Test sites: ?sample=challenges lists every state (see src/lib/clash/sample.ts).
  const sample = clashSample((await searchParams).sample);
  const me = currentUserId();
  const clash = me.then((id) => (id ? getHomeClash(id) : null));
  const challenges = sample ? Promise.resolve(SAMPLE_CHALLENGES) : me.then((id) => (id ? getChallenges(id) : []));
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

async function Challenges({ challenges }: { challenges: Promise<Awaited<ReturnType<typeof getChallenges>>> }) {
  return <ChallengeList challenges={await challenges} />;
}

async function Three({ clash }: { clash: Promise<HomeClash | null> }) {
  return <YourThree three={(await clash)?.three ?? []} />;
}
