import { ImageResponse } from "next/og";
import { weekLabel } from "@/components/league/format";
import { publicEnv } from "@/lib/env";
import { getGlobalTable, weekRound } from "@/lib/league/data";
import { teamOfTheWeek } from "@/lib/league/standing";
import { TEAM_SIZE, TeamImage } from "@/lib/league/TeamImage";
import { ogFonts } from "@/lib/og/fonts";

// The team of the week as a 1080 x 1080 PNG. Everyone sees the same team, so
// it's no one's own; it changes as people play, so it's only cached briefly.
export async function GET() {
  const { week, top, players } = await getGlobalTable();
  const card = {
    xi: teamOfTheWeek(top).xi,
    weekLabel: weekLabel(week),
    players,
    round: await weekRound(week),
    host: publicEnv().NEXT_PUBLIC_SITE_URL.replace(/^https?:\/\//, "").replace(/\/$/, ""),
  };
  return new ImageResponse(<TeamImage d={card} />, {
    width: TEAM_SIZE,
    height: TEAM_SIZE,
    fonts: await ogFonts(),
    headers: { "Cache-Control": "public, max-age=300" },
  });
}
