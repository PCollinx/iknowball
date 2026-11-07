import "server-only";
import webpush, { WebPushError } from "web-push";
import { serverEnv } from "@/lib/env";
import { PRIVACY_EMAIL } from "@/lib/site";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Buzz } from "./copy";

// Sending the whistle (Collins, 7 Nov 2026). Every buzz is claimed in
// push_sends first, so a rerun or a second full time view never sends it
// twice; a device the push service says is gone is deleted.

/** The three switches on Your shirt. */
export type Pref = "daily" | "challenges" | "league";

export type Device = { id: number; user_id: string; endpoint: string; p256dh: string; auth: string };

export type BlowResult = { players: number; devices: number; gone: number; failed: number };

/** Rows per `in` filter: a long list of ids makes the request URL too long. */
const CHUNK = 200;
/** Pushes in flight at once. */
const AT_ONCE = 20;

let ready: boolean | null = null;

/** Whether the keys are set; sets them up on first use. */
export function whistleReady(): boolean {
  if (ready !== null) return ready;
  const env = serverEnv();
  ready = Boolean(env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY);
  if (ready) webpush.setVapidDetails(`mailto:${PRIVACY_EMAIL ?? "privacy@playiknowball.com"}`, env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!, env.VAPID_PRIVATE_KEY!);
  return ready;
}

function chunks<T>(list: T[], size = CHUNK): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

/** Devices with a switch on, for some players or (no list) everyone. */
export async function devicesFor(pref: Pref, userIds?: string[]): Promise<Device[]> {
  const admin = createAdminClient();
  const columns = "id, user_id, endpoint, p256dh, auth";
  if (!userIds) {
    const out: Device[] = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await admin.from("push_subscriptions").select(columns).eq(pref, true).order("id").range(from, from + 999);
      if (error) throw error;
      out.push(...((data ?? []) as Device[]));
      if (!data || data.length < 1000) return out;
    }
  }
  const out: Device[] = [];
  for (const ids of chunks(userIds)) {
    const { data, error } = await admin.from("push_subscriptions").select(columns).eq(pref, true).in("user_id", ids);
    if (error) throw error;
    out.push(...((data ?? []) as Device[]));
  }
  return out;
}

/** Claims `key` for these players; returns the ones it wasn't already sent to. */
async function claim(userIds: string[], key: string): Promise<Set<string>> {
  const fresh = new Set<string>();
  for (const ids of chunks(userIds)) {
    const { data, error } = await createAdminClient()
      .from("push_sends")
      .upsert(
        ids.map((user_id) => ({ user_id, key })),
        { onConflict: "user_id,key", ignoreDuplicates: true },
      )
      .select("user_id");
    if (error) throw error;
    for (const r of data ?? []) fresh.add(r.user_id as string);
  }
  return fresh;
}

/** One push to one device. Returns "gone" when the push service has dropped it. */
export async function push(device: Device, buzz: Buzz, ttlSeconds: number): Promise<"ok" | "gone" | "failed"> {
  try {
    await webpush.sendNotification({ endpoint: device.endpoint, keys: { p256dh: device.p256dh, auth: device.auth } }, JSON.stringify(buzz), {
      TTL: ttlSeconds,
      urgency: "normal",
    });
    return "ok";
  } catch (e) {
    if (e instanceof WebPushError && (e.statusCode === 404 || e.statusCode === 410)) return "gone";
    return "failed";
  }
}

/**
 * Blows the whistle: each player's buzz (the same for all, or one each) to
 * every device of theirs with the switch on, once per `key`. Players with no
 * such device aren't claimed, so they'd still get it if they switch on today.
 */
export async function blow(
  devices: Device[],
  key: string,
  buzz: Buzz | ((userId: string) => Buzz | null),
  ttlSeconds: number,
): Promise<BlowResult> {
  const result: BlowResult = { players: 0, devices: 0, gone: 0, failed: 0 };
  if (!devices.length || !whistleReady()) return result;
  const buzzOf = new Map<string, Buzz>();
  for (const userId of new Set(devices.map((d) => d.user_id))) {
    const b = typeof buzz === "function" ? buzz(userId) : buzz;
    if (b) buzzOf.set(userId, b);
  }
  const fresh = await claim([...buzzOf.keys()], key);
  const due = devices.flatMap((d) => (fresh.has(d.user_id) ? [{ d, b: buzzOf.get(d.user_id)! }] : []));
  result.players = new Set(due.map(({ d }) => d.user_id)).size;
  const gone: number[] = [];
  for (const batch of chunks(due, AT_ONCE)) {
    const outcomes = await Promise.all(batch.map(({ d, b }) => push(d, b, ttlSeconds)));
    outcomes.forEach((o, i) => {
      if (o === "ok") result.devices++;
      else if (o === "gone") gone.push(batch[i].d.id);
      else result.failed++;
    });
  }
  result.gone = gone.length;
  for (const ids of chunks(gone)) await createAdminClient().from("push_subscriptions").delete().in("id", ids);
  return result;
}
