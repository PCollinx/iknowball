import { ImageResponse } from "next/og";
import { serverEnv } from "@/lib/env";
import { HERO_H, HERO_W, HeroImage } from "@/lib/launch/HeroImage";
import { readWaitlistToken } from "@/lib/launch/token";
import { ogFonts } from "@/lib/og/fonts";
import { kitOf, type Club } from "@/lib/profile/club";
import { CLUB_COLUMNS } from "@/lib/profile/data";
import { createAdminClient } from "@/lib/supabase/admin";
import { GATES_OPEN_LABEL } from "@/lib/waitlist";

// The launch email's top as a PNG, for one waitlist row: their shirt in their
// club's kit, number and name. The link's signed token names the row, so the
// URL carries no email or name. Stays the same, so inboxes may cache it a day.
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const id = readWaitlistToken((await params).token, serverEnv().CRON_SECRET);
  if (!id) return new Response("Not found", { status: 404 });
  const admin = createAdminClient();
  const [{ data: row }, { count }] = await Promise.all([
    admin.from("waitlist").select("name, favourite_club").eq("id", id).maybeSingle(),
    admin.from("waitlist").select("id", { head: true, count: "exact" }).lte("id", id),
  ]);
  if (!row) return new Response("Not found", { status: 404 });
  const { data: club } = row.favourite_club ? await admin.from("clubs").select(CLUB_COLUMNS).eq("name", row.favourite_club).maybeSingle() : { data: null };
  return new ImageResponse(<HeroImage h={{ name: row.name, position: count ?? 1, kit: kitOf((club as Club | null) ?? null), when: GATES_OPEN_LABEL }} />, {
    width: HERO_W,
    height: HERO_H,
    fonts: await ogFonts(),
    headers: { "Cache-Control": "public, max-age=86400" },
  });
}
