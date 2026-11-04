import "server-only";
import { serverEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { readWaitlistToken } from "./token";

/** Takes a waitlist row off the email list, by its signed token. False when the token isn't ours. */
export async function unsubscribe(token: string): Promise<boolean> {
  const id = readWaitlistToken(token, serverEnv().CRON_SECRET);
  if (!id) return false;
  const { error } = await createAdminClient().from("waitlist").update({ unsubscribed_at: new Date().toISOString() }).eq("id", id).is("unsubscribed_at", null);
  if (error) throw error;
  return true;
}
