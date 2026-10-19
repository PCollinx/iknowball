import "server-only";
import { currentUserId } from "@/lib/daily/data";
import { createClient } from "./server";

/** The signed-in player, or a new guest (anonymous sign-in) for a first-timer. */
export async function ensureUserId(): Promise<string> {
  const userId = await currentUserId();
  if (userId) return userId;
  const { data, error } = await (await createClient()).auth.signInAnonymously();
  if (error || !data.user) {
    console.error("Guest sign-in failed:", error?.message ?? "no user returned");
    throw new Error("Couldn't start a guest session. Try again.");
  }
  return data.user.id;
}
