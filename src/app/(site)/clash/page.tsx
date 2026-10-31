import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { BestCell } from "@/components/clash/Board";
import { ClashKickOff } from "@/components/clash/KickOff";
import { KeepyUppy } from "@/components/loading/KeepyUppy";
import { getHomeClash } from "@/lib/clash/data";
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
// best this week streams into the board after it.
async function KickOff() {
  await connection();
  return (
    <ClashKickOff
      stat={statOfDay(gameDate())}
      best={
        <Suspense fallback={<BestCell best={null} lastCode={null} />}>
          <Best />
        </Suspense>
      }
    />
  );
}

async function Best() {
  const userId = await currentUserId();
  if (!userId) return <BestCell best={null} lastCode={null} />;
  return <BestCell {...await getHomeClash(userId)} />;
}
