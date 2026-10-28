import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { BestCell } from "@/components/clash/Board";
import { ClashKickOff } from "@/components/clash/KickOff";
import { getHomeClash } from "@/lib/clash/data";
import { currentUserId } from "@/lib/daily/data";

export const metadata: Metadata = {
  title: "Clash · iKnowBall",
  description: "Sixty seconds of Higher or Lower. Send the link and settle it.",
};

export default function ClashPage() {
  return (
    <ClashKickOff
      best={
        <Suspense fallback={<BestCell best={null} lastCode={null} />}>
          <Best />
        </Suspense>
      }
    />
  );
}

// Reads the session, so it streams into the board after the static kick-off.
async function Best() {
  await connection();
  const userId = await currentUserId();
  if (!userId) return <BestCell best={null} lastCode={null} />;
  return <BestCell {...await getHomeClash(userId)} />;
}
