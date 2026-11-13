import { ImageResponse } from "next/og";
import { shareCardData } from "@/components/daily/share";
import { currentUserId, getDailyView } from "@/lib/daily/data";
import { SHARE_SIZE, ShareImage } from "@/lib/daily/ShareImage";
import { publicEnv } from "@/lib/env";
import { ogFonts } from "@/lib/og/fonts";
import { kitsForFixture } from "@/lib/profile/data";

// Your share card for today's Daily as a 1080 x 1080 PNG, once you've reached
// full time. It's yours alone (it reads your session), so it's never cached.
export async function GET() {
  const userId = await currentUserId();
  if (!userId) return new Response("Play today's Daily first", { status: 404 });
  const view = await getDailyView();
  if (view.kind !== "fulltime" || !view.recall) return new Response("Finish today's Daily first", { status: 404 });

  const card = shareCardData({
    playDate: view.playDate,
    recall: view.recall,
    order: view.order,
    points: view.points,
    siteUrl: publicEnv().NEXT_PUBLIC_SITE_URL,
    name: view.me?.name ?? null,
    kits: await kitsForFixture(view.recall.daily.title),
  });
  return new ImageResponse(<ShareImage d={card} />, {
    width: SHARE_SIZE,
    height: SHARE_SIZE,
    fonts: await ogFonts(),
    headers: { "Cache-Control": "private, no-store" },
  });
}
