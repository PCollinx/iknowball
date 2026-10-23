import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { ClashKickOff, YourBest } from "@/components/clash/KickOff";
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
        <Suspense fallback={null}>
          <Best />
        </Suspense>
      }
    />
  );
}

// Reads the session, so it streams in after the static kick-off.
async function Best() {
  await connection();
  const userId = await currentUserId();
  if (!userId) return null;
  return <YourBest {...await getHomeClash(userId)} />;
}
