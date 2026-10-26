import type { NextRequest } from "next/server";
import { currentUserId } from "@/lib/daily/data";
import { isAdmin } from "@/lib/maker/data";
import { fixtureKit } from "@/lib/profile/club";
import { ROYAL_KIT } from "@/components/daily/ShirtBack";
import { allClubs } from "@/lib/teaser/data";
import { parseTeaser, shirtKits, withHeadline } from "@/lib/teaser/layout";
import { renderTeaser } from "@/lib/teaser/render";

// The teaser as a PNG, drawn on the server. Admins only, like the maker.
export async function GET(request: NextRequest) {
  const userId = await currentUserId();
  if (!userId || !(await isAdmin(userId))) return new Response("Staff only", { status: 403 });

  const asked = parseTeaser(Object.fromEntries(request.nextUrl.searchParams));
  const clubs = await allClubs();
  const club = (id: number | null) => clubs.find((c) => c.id === id) ?? null;
  const t = withHeadline(
    asked,
    [club(asked.home), club(asked.away)].flatMap((c) => (c ? [c.name] : [])),
  );
  const kit = fixtureKit(club(t.home), club(t.away)) ?? ROYAL_KIT;

  const name = `teaser-${String(t.no).padStart(2, "0")}-${t.format}.png`;
  return renderTeaser(t, shirtKits(t, clubs, kit), {
    "Cache-Control": "private, no-store",
    ...(request.nextUrl.searchParams.has("download") ? { "Content-Disposition": `attachment; filename="${name}"` } : {}),
  });
}
