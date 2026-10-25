import { ImageResponse } from "next/og";
import { clashCard } from "@/lib/clash/card";
import { getClashView } from "@/lib/clash/data";
import { RESULT_SIZE, ResultImage } from "@/lib/clash/ResultImage";
import { isPreview, previewView } from "@/lib/clash/sample";
import { currentUserId } from "@/lib/daily/data";
import { isTestSite } from "@/lib/daily/sample";
import { publicEnv } from "@/lib/env";
import { ogFonts } from "@/lib/og/fonts";
import { getRating } from "@/lib/profile/data";

// Your Clash result card as a 1080 x 1080 PNG, once your sprint is over. It's
// yours alone (it reads your session), so it's never cached.
export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  // Test sites only: ?preview= draws full time's sample states, as the page does.
  const preview = new URL(req.url).searchParams.get("preview");
  const sample = isTestSite() && isPreview(preview) ? preview : null;
  const siteUrl = publicEnv().NEXT_PUBLIC_SITE_URL;
  let card;
  if (sample) {
    card = clashCard(previewView(sample, code.toUpperCase()), 7.4, siteUrl);
  } else {
    const userId = await currentUserId();
    if (!userId) return new Response("Play the sprint first", { status: 404 });
    const view = await getClashView(code.toUpperCase());
    if (view.kind !== "fulltime") return new Response("Finish the sprint first", { status: 404 });
    card = clashCard(view, await getRating(userId), siteUrl);
  }
  return new ImageResponse(<ResultImage d={card} />, {
    width: RESULT_SIZE,
    height: RESULT_SIZE,
    fonts: await ogFonts(),
    headers: { "Cache-Control": "private, no-store" },
  });
}
