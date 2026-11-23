import "server-only";
import { blow, whistleReady, type BlowResult, type Device } from "@/lib/push/send";
import { createAdminClient } from "@/lib/supabase/admin";
import { gameDate } from "@/lib/time";
import { draftPost } from "./data";
import { POSTS, postBuzz, postsOn, type PostKind } from "./plan";

// The Posts tab's buzz (Collins, 23 Nov 2026): the whistle tells the admins'
// phones when posts are ready, so 09:00 isn't missed. Morning (09:00 WAT): the
// day's posts before full time; evening (22:00 WAT): full time. Any device an
// admin has turned the whistle on for gets it, whatever its switches.

export type PostBuzzResult = { skipped: string } | { posts: PostKind[]; sent: BlowResult };

const HOUR = 3600;

async function adminDevices(): Promise<Device[]> {
  const admin = createAdminClient();
  const staff = await admin.from("profiles").select("id").eq("is_admin", true);
  if (staff.error) throw staff.error;
  const ids = (staff.data ?? []).map((p) => p.id as string);
  if (!ids.length) return [];
  const { data, error } = await admin.from("push_subscriptions").select("id, user_id, endpoint, p256dh, auth").in("user_id", ids);
  if (error) throw error;
  return (data ?? []) as Device[];
}

export async function postsBuzz(slot: "morning" | "evening"): Promise<PostBuzzResult> {
  if (!whistleReady()) return { skipped: "No VAPID keys set." };
  const today = gameDate();
  const due = postsOn(today).filter((k) => (slot === "evening" ? k === "full-time" : POSTS[k].hour < POSTS["full-time"].hour));
  const drafts = await Promise.all(due.map((k) => draftPost(k, today)));
  const done = await createAdminClient().from("x_posts").select("kind").eq("play_date", today).not("status", "is", null);
  if (done.error) throw done.error;
  const handled = new Set((done.data ?? []).map((p) => p.kind as string));
  const ready = due.filter((k, i) => drafts[i].words !== null && !handled.has(k));
  const buzz = postBuzz(ready);
  if (!buzz) return { skipped: "Nothing to post." };
  const sent = await blow(await adminDevices(), `posts:${today}:${slot}`, buzz, 6 * HOUR);
  return { posts: ready, sent };
}
