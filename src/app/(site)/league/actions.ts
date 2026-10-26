"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { cleanCode, newLeagueCode } from "@/components/league/format";
import { currentUserId } from "@/lib/daily/data";
import { leagueByCode } from "@/lib/league/data";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureUserId } from "@/lib/supabase/guest";

// Leagues are written by the service role only; every action re-reads the
// player from the session.

const name = z.string().trim().min(2, "Give it a name of at least 2 letters.").max(40, "Keep the name to 40 letters.");
const code = z
  .string()
  .transform(cleanCode)
  .pipe(z.string().regex(/^[A-Z0-9]{6}$/, "Codes are 6 letters and numbers, like IKB7QX."));

export type LeagueFormState = { error: string | null };

/** Starts a league with you in it, then shows its invite. */
export async function createLeague(_: LeagueFormState, formData: FormData): Promise<LeagueFormState> {
  const parsed = name.safeParse(formData.get("name"));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const userId = await ensureUserId();
  const admin = createAdminClient();
  for (let tries = 0; tries < 5; tries++) {
    const { data, error } = await admin.from("leagues").insert({ name: parsed.data, owner_id: userId, invite_code: newLeagueCode() }).select("id, invite_code").single();
    if (error?.code === "23505") continue;
    if (error) throw error;
    const { error: joinError } = await admin.from("league_members").insert({ league_id: data.id, user_id: userId });
    if (joinError) throw joinError;
    redirect(`/league/${data.invite_code}?new=1`);
  }
  throw new Error("Couldn't pick an invite code. Try again.");
}

/** Joins a league by its code. */
export async function joinLeague(_: LeagueFormState, formData: FormData): Promise<LeagueFormState> {
  const parsed = code.safeParse(formData.get("code"));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const league = await leagueByCode(parsed.data);
  if (!league) return { error: `No league has the code ${parsed.data}. Check it with whoever sent it.` };
  const userId = await ensureUserId();
  const { error } = await createAdminClient().from("league_members").insert({ league_id: league.id, user_id: userId });
  if (error?.message.includes("league_full")) return { error: "That league is full: 50 players is the most." };
  if (error && error.code !== "23505") throw error;
  redirect(`/league/${league.invite_code}`);
}

/** Leaves a league. A league with nobody left is deleted; an owner who leaves hands it to the longest-serving member. */
export async function leaveLeague(formData: FormData) {
  const userId = await currentUserId();
  const league = await leagueByCode(code.parse(formData.get("code")));
  if (!userId || !league) redirect("/league");
  const admin = createAdminClient();
  const { error } = await admin.from("league_members").delete().eq("league_id", league.id).eq("user_id", userId);
  if (error) throw error;
  const { data: next } = await admin.from("league_members").select("user_id").eq("league_id", league.id).order("joined_at").limit(1).maybeSingle();
  if (!next) await admin.from("leagues").delete().eq("id", league.id);
  else if (league.owner_id === userId) await admin.from("leagues").update({ owner_id: next.user_id }).eq("id", league.id);
  redirect("/league");
}
