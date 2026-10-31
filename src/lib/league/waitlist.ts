import "server-only";
import { cache } from "react";
import { newLeagueCode } from "@/components/league/format";
import { currentEmail, currentUserId } from "@/lib/daily/data";
import { isTestSite } from "@/lib/daily/sample";
import { createAdminClient } from "@/lib/supabase/admin";
import { GATES_OPEN } from "@/lib/waitlist";

// Waitlist leagues (Collins, 31 Oct 2026, step 18 of the launch plan): the
// waitlist's "Bring your league" starts on launch day. The league is made the
// first time that email signs in from Fri 20 Nov (test sites any time), with
// them as captain: the signed-in email is what proves it's theirs. Called on
// sign-in, on home and on the League page; each row is claimed once.

/** The name a waitlist league gets: tidied to the League's 2 to 40 letters, or null. */
export function waitlistLeagueName(raw: string | null): string | null {
  const name = (raw ?? "").replace(/\s+/g, " ").trim().slice(0, 40).trim();
  return name.length >= 2 ? name : null;
}

/** Whether waitlist leagues can be made yet. */
export function waitlistLeaguesOpen(now = new Date()): boolean {
  return isTestSite() || now >= GATES_OPEN;
}

/** Makes the league this email named on the waitlist, once. Returns its invite code when made now. */
export async function claimWaitlistLeague(userId: string, email: string | null | undefined): Promise<string | null> {
  if (!email || !waitlistLeaguesOpen()) return null;
  const admin = createAdminClient();
  const { data: row, error } = await admin.from("waitlist").select("id, league_name").eq("email", email.trim().toLowerCase()).is("league_claimed_at", null).maybeSingle();
  if (error) throw error;
  if (!row?.league_name) return null;

  // Claim the row first, so two sign-ins at once can't make it twice.
  const { data: claimed, error: claimError } = await admin
    .from("waitlist")
    .update({ league_claimed_at: new Date().toISOString() })
    .eq("id", row.id)
    .is("league_claimed_at", null)
    .select("id");
  if (claimError) throw claimError;
  const name = waitlistLeagueName(row.league_name);
  if (!claimed?.length || !name) return null;

  for (let tries = 0; tries < 5; tries++) {
    const { data, error: insertError } = await admin.from("leagues").insert({ name, owner_id: userId, invite_code: newLeagueCode() }).select("id, invite_code").single();
    if (insertError?.code === "23505") continue;
    if (insertError) throw insertError;
    const [joined, linked] = await Promise.all([
      admin.from("league_members").insert({ league_id: data.id, user_id: userId }),
      admin.from("waitlist").update({ league_id: data.id }).eq("id", row.id),
    ]);
    if (joined.error) throw joined.error;
    if (linked.error) throw linked.error;
    return data.invite_code as string;
  }
  return null;
}

/** The signed-in player's waitlist league, made if it's due: once a request, before the League reads their leagues. */
export const claimMine = cache(async (): Promise<string | null> => {
  if (!waitlistLeaguesOpen()) return null;
  const [me, email] = await Promise.all([currentUserId(), currentEmail()]);
  return me ? claimWaitlistLeague(me, email) : null;
});
