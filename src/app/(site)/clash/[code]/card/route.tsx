import { ImageResponse } from "next/og";
import { CARD_CHAIN } from "@/components/clash/result";
import { clashCard } from "@/lib/clash/card";
import { getClashView } from "@/lib/clash/data";
import { RESULT_SIZE, ResultImage } from "@/lib/clash/ResultImage";
import { currentUserId } from "@/lib/daily/data";
import { publicEnv } from "@/lib/env";
import { ogFonts } from "@/lib/og/fonts";
import { kitOf } from "@/lib/profile/club";
import { clubsByIds } from "@/lib/profile/data";

// Your Clash result card as a 1080 x 1080 PNG, once your sprint is over. It's
// yours alone (it reads your session), so it's never cached.
export async function GET(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const userId = await currentUserId();
  if (!userId) return new Response("Play the sprint first", { status: 404 });
  const view = await getClashView(code.toUpperCase());
  if (view.kind !== "fulltime") return new Response("Finish the sprint first", { status: 404 });
  // Only the chain's players need their clubs.
  const ids = view.set.items.slice(0, CARD_CHAIN).map((i) => i.club_id).filter((id): id is number => id !== null);
  const clubs = await clubsByIds([...new Set(ids)]);
  const kits = new Map([...clubs].map(([id, club]) => [id, { name: club.name, kit: kitOf(club) }]));
  const card = clashCard(view, kits, publicEnv().NEXT_PUBLIC_SITE_URL);
  return new ImageResponse(<ResultImage d={card} />, {
    width: RESULT_SIZE,
    height: RESULT_SIZE,
    fonts: await ogFonts(),
    headers: { "Cache-Control": "private, no-store" },
  });
}
