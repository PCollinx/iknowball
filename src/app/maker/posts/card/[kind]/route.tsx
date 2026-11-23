import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { RESULT_SIZE, ResultImage } from "@/lib/clash/ResultImage";
import { currentUserId } from "@/lib/daily/data";
import { SHARE_SIZE, ShareImage } from "@/lib/daily/ShareImage";
import { TEAM_SIZE, TeamImage } from "@/lib/league/TeamImage";
import { isAdmin } from "@/lib/maker/data";
import { ogFonts } from "@/lib/og/fonts";
import { draftPost } from "@/lib/posts/data";
import { isPostKind } from "@/lib/posts/plan";
import { gameDate } from "@/lib/time";

// A post's card as a 1080 x 1080 PNG, for the maker's Posts tab. Admins only,
// like the maker; drawn fresh, so the 22:00 numbers are the latest.
export async function GET(request: NextRequest, { params }: { params: Promise<{ kind: string }> }) {
  const userId = await currentUserId();
  if (!userId || !(await isAdmin(userId))) return new Response("Staff only", { status: 403 });
  const { kind } = await params;
  if (!isPostKind(kind)) return new Response("No such post", { status: 404 });
  const date = request.nextUrl.searchParams.get("date") ?? gameDate();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return new Response("Bad date", { status: 400 });

  const { card } = await draftPost(kind, date);
  if (!card) return new Response("Nothing to post yet", { status: 404 });
  const headers = { "Cache-Control": "private, no-store", "Content-Disposition": `inline; filename="iknowball-${kind}-${date}.png"` };
  const fonts = await ogFonts();
  if (card.kind === "team") return new ImageResponse(<TeamImage d={card.d} />, { width: TEAM_SIZE, height: TEAM_SIZE, fonts, headers });
  if (card.kind === "clash") return new ImageResponse(<ResultImage d={card.d} />, { width: RESULT_SIZE, height: RESULT_SIZE, fonts, headers });
  return new ImageResponse(<ShareImage d={card.d} />, { width: SHARE_SIZE, height: SHARE_SIZE, fonts, headers });
}
