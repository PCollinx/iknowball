"use server";

import { z } from "zod";
import { currentUserId } from "@/lib/daily/data";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureUserId } from "@/lib/supabase/guest";
import { testBuzz } from "./copy";
import { push, whistleReady, type Device, type Pref } from "./send";

// The whistle's switches (Collins, 7 Nov 2026). A device is known by its push
// endpoint, which only that browser holds; each action re-reads the player
// from the session, so a device can only be changed by whoever saved it.

export type Prefs = Record<Pref, boolean>;

const endpoint = z.url().startsWith("https://").max(1000);
const subscription = z.object({
  endpoint,
  keys: z.object({ p256dh: z.string().min(1).max(200), auth: z.string().min(1).max(100) }),
});
const pref = z.enum(["daily", "challenges", "league"]);

/** Turns the whistle on for this device. `prefs` sets which switches start on (all, unless given). */
export async function saveWhistle(sub: unknown, prefs: Partial<Prefs> = {}): Promise<Prefs | null> {
  const parsed = subscription.safeParse(sub);
  if (!parsed.success) return null;
  const userId = await ensureUserId();
  const row = {
    user_id: userId,
    endpoint: parsed.data.endpoint,
    p256dh: parsed.data.keys.p256dh,
    auth: parsed.data.keys.auth,
    daily: prefs.daily ?? true,
    challenges: prefs.challenges ?? true,
    league: prefs.league ?? true,
  };
  const { data, error } = await createAdminClient()
    .from("push_subscriptions")
    .upsert(row, { onConflict: "endpoint" })
    .select("daily, challenges, league")
    .single();
  if (error) throw error;
  return data as Prefs;
}

/** This device's switches, or null when it isn't saved (or is someone else's). */
export async function whistleFor(device: string): Promise<Prefs | null> {
  const [userId, parsed] = [await currentUserId(), endpoint.safeParse(device)];
  if (!userId || !parsed.success) return null;
  const { data } = await createAdminClient()
    .from("push_subscriptions")
    .select("daily, challenges, league")
    .eq("endpoint", parsed.data)
    .eq("user_id", userId)
    .maybeSingle();
  return (data as Prefs | null) ?? null;
}

/** Flips one switch on this device. */
export async function setWhistle(device: string, which: Pref, on: boolean): Promise<Prefs | null> {
  const [userId, parsed, p] = [await currentUserId(), endpoint.safeParse(device), pref.safeParse(which)];
  if (!userId || !parsed.success || !p.success) return null;
  const { data, error } = await createAdminClient()
    .from("push_subscriptions")
    .update({ [p.data]: on === true })
    .eq("endpoint", parsed.data)
    .eq("user_id", userId)
    .select("daily, challenges, league")
    .maybeSingle();
  if (error) throw error;
  return (data as Prefs | null) ?? null;
}

/** "Send me a test": one buzz to this device only. */
export async function testWhistle(device: string): Promise<"sent" | "failed"> {
  const [userId, parsed] = [await currentUserId(), endpoint.safeParse(device)];
  if (!userId || !parsed.success || !whistleReady()) return "failed";
  const { data } = await createAdminClient()
    .from("push_subscriptions")
    .select("id, user_id, endpoint, p256dh, auth")
    .eq("endpoint", parsed.data)
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) return "failed";
  const outcome = await push(data as Device, testBuzz, 600);
  if (outcome === "gone") await createAdminClient().from("push_subscriptions").delete().eq("id", (data as Device).id);
  return outcome === "ok" ? "sent" : "failed";
}
