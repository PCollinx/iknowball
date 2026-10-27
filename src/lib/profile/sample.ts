import "server-only";
import type { HubLine, League } from "@/lib/league/data";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Club } from "./club";
import { CLUB_COLUMNS, type ProfileView } from "./data";

// Test sites only: the profile with sample numbers, so Collins can see each
// state before real ones fill it. The forms still act on your own account.
// /profile?preview=guest|placed|switched|neutral. Remove once tested.

export const PROFILE_PREVIEWS = ["guest", "placed", "switched", "neutral"] as const;
export type ProfilePreview = (typeof PROFILE_PREVIEWS)[number];
export const isProfilePreview = (v: unknown): v is ProfilePreview => PROFILE_PREVIEWS.includes(v as never);

const LEAGUES: [string, number | null, number][] = [
  ["Yaba Ballers", 2, 8],
  ["The Okafors", 1, 5],
  ["Sunday League Legends", null, 14],
];

export async function previewProfile(kind: ProfilePreview): Promise<{ view: ProfileView; leagues: HubLine[] }> {
  const { data, error } = await createAdminClient().from("clubs").select(CLUB_COLUMNS).eq("short_name", "CHE").maybeSingle();
  if (error) throw error;
  const chelsea = (data as Club | null) ?? null;
  const guest = kind === "guest";
  const view: ProfileView = {
    club: kind === "neutral" || guest ? null : chelsea,
    asked: !guest,
    switchedThisSeason: kind === "switched",
    username: guest ? null : "Pitchside_Tunde",
    rating: guest ? 6.2 : 7.4,
    tier: guest ? null : "Ball Knower",
    daysPlayed: guest ? 2 : 24,
    streak: guest ? 2 : 9,
    weekScore: guest ? 118 : 312,
    weekDays: guest ? 2 : 4,
    weekClash: guest ? 0 : 62,
    leagues: [],
  };
  const leagues: HubLine[] = guest
    ? []
    : LEAGUES.map(([name, position, members], i) => ({
        league: { id: -1 - i, name, invite_code: `IKBSA${i}`, owner_id: "sample" } satisfies League,
        members,
        position,
        points: position ? 312 : 0,
        moved: null,
        top: [],
        gap: "",
      }));
  return { view, leagues };
}
