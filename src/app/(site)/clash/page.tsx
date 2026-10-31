import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { BestCell } from "@/components/clash/Board";
import { ClashKickOff } from "@/components/clash/KickOff";
import { YourThree } from "@/components/clash/YourThree";
import { KeepyUppy } from "@/components/loading/KeepyUppy";
import { getHomeClash, type HomeClash } from "@/lib/clash/data";
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
// best and your three this week stream in after it, from one read.
async function KickOff() {
  await connection();
  const clash = currentUserId().then((id) => (id ? getHomeClash(id) : null));
  return (
    <ClashKickOff
      stat={statOfDay(gameDate())}
      best={
        <Suspense fallback={<BestCell best={null} lastCode={null} />}>
          <Best clash={clash} />
        </Suspense>
      }
      three={
        <Suspense fallback={<YourThree three={[]} />}>
          <Three clash={clash} />
        </Suspense>
      }
    />
  );
}

async function Best({ clash }: { clash: Promise<HomeClash | null> }) {
  const c = await clash;
  return <BestCell best={c?.three[0] ?? null} lastCode={c?.lastCode ?? null} />;
}

async function Three({ clash }: { clash: Promise<HomeClash | null> }) {
  return <YourThree three={(await clash)?.three ?? []} />;
}
