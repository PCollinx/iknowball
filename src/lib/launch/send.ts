import "server-only";
import { isTestSite } from "@/lib/daily/sample";
import { serverEnv } from "@/lib/env";
import { waitlistLeagueName } from "@/lib/league/waitlist";
import { PRIVACY_EMAIL } from "@/lib/site";
import { createAdminClient } from "@/lib/supabase/admin";
import { gameDate } from "@/lib/time";
import { GATES_OPEN } from "@/lib/waitlist";
import { launchHtml, launchSubject, launchText, type LaunchEmail } from "./email";
import { waitlistToken } from "./token";

// The launch email's job (step 17): from the morning the gates open (test
// sites any time), everyone on the waitlist not yet emailed or unsubscribed,
// oldest first, up to the day's cap. Each row is marked when Resend takes it,
// so the next run carries on where this one stopped.

const FROM = "iKnowBall <noreply@playiknowball.com>";
/** Resend takes 100 emails a batch. */
const BATCH = 100;

export type LaunchResult = { sent: number; left: number; note?: string };

type Row = { id: number; email: string; name: string | null; favourite_club: string | null; league_name: string | null; league_claimed_at: string | null };

const site = () => serverEnv().NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");

/** Each row's number on the team sheet: its place among every row by id, as the waitlist page counts it. */
async function positions(): Promise<Map<number, number>> {
  const admin = createAdminClient();
  const ids: number[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await admin.from("waitlist").select("id").order("id").range(from, from + 999);
    if (error) throw error;
    ids.push(...data.map((r) => r.id));
    if (data.length < 1000) break;
  }
  return new Map(ids.map((id, i) => [id, i + 1]));
}

/** Today's Daily, as its title ("Chelsea v Man City"), once it's scheduled. */
async function todaysFixture(): Promise<string | null> {
  const { data } = await createAdminClient().from("dailies").select("title").eq("play_date", gameDate()).eq("part", 1).eq("status", "scheduled").maybeSingle();
  return data?.title ?? null;
}

/** One row's email. */
export function emailFor(row: Row, position: number, fixture: string | null): LaunchEmail & { to: string } {
  const env = serverEnv();
  const token = waitlistToken(row.id, env.CRON_SECRET);
  const league = waitlistLeagueName(row.league_name);
  return {
    to: row.email,
    name: row.name,
    position,
    fixture,
    league: league ? { name: league, made: Boolean(row.league_claimed_at) } : null,
    site: site(),
    heroUrl: `${site()}/email/hero/${token}`,
    unsubscribeUrl: `${site()}/unsubscribe/${token}`,
    replyTo: PRIVACY_EMAIL,
  };
}

/** The Resend message for one email, with one-click unsubscribe headers. */
export function message(e: LaunchEmail & { to: string }) {
  return {
    from: FROM,
    to: [e.to],
    subject: launchSubject(e),
    html: launchHtml(e),
    text: launchText(e),
    ...(e.replyTo ? { reply_to: e.replyTo } : {}),
    headers: {
      "List-Unsubscribe": `<${e.unsubscribeUrl.replace("/unsubscribe/", "/api/unsubscribe/")}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  };
}

/** Sends messages through Resend's batch endpoint. The key makes a retried batch a no-op on Resend's side. */
export async function sendBatch(messages: ReturnType<typeof message>[], key: string): Promise<void> {
  const apiKey = serverEnv().RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY isn't set, so nothing was sent.");
  const res = await fetch("https://api.resend.com/emails/batch", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "Idempotency-Key": key },
    body: JSON.stringify(messages),
  });
  if (!res.ok) throw new Error(`Resend said ${res.status}: ${(await res.text()).slice(0, 300)}`);
}

export async function sendLaunchEmails(now = new Date()): Promise<LaunchResult> {
  if (now < GATES_OPEN && !isTestSite()) return { sent: 0, left: 0, note: "The gates aren't open yet." };
  const admin = createAdminClient();
  const { data: rows, error } = await admin
    .from("waitlist")
    .select("id, email, name, favourite_club, league_name, league_claimed_at")
    .is("launch_emailed_at", null)
    .is("unsubscribed_at", null)
    .order("id")
    .limit(2000);
  if (error) throw error;
  if (!rows.length) return { sent: 0, left: 0, note: "Everyone has had it." };

  // The day's cap counts what went out in the last 24 hours, so a manual run on top of the cron stays inside it.
  const { count, error: countError } = await admin
    .from("waitlist")
    .select("id", { head: true, count: "exact" })
    .gte("launch_emailed_at", new Date(now.getTime() - 86_400_000).toISOString());
  if (countError) throw countError;
  const room = Math.max(0, serverEnv().LAUNCH_EMAIL_DAILY_CAP - (count ?? 0));
  const due = (rows as Row[]).slice(0, room);
  if (!due.length) return { sent: 0, left: rows.length, note: "Today's cap is used; the rest go tomorrow." };

  const [places, fixture] = await Promise.all([positions(), todaysFixture()]);
  let sent = 0;
  for (let i = 0; i < due.length; i += BATCH) {
    const batch = due.slice(i, i + BATCH);
    await sendBatch(
      batch.map((r) => message(emailFor(r, places.get(r.id) ?? r.id, fixture))),
      `launch-email/${batch[0].id}-${batch[batch.length - 1].id}`,
    );
    const { error: markError } = await admin
      .from("waitlist")
      .update({ launch_emailed_at: new Date().toISOString() })
      .in(
        "id",
        batch.map((r) => r.id),
      );
    if (markError) throw markError;
    sent += batch.length;
  }
  return { sent, left: rows.length - sent };
}

/** The email one address would get: its own row's, else the first row's (or a made-up one on an empty list). */
export async function sampleLaunchEmail(to: string): Promise<LaunchEmail & { to: string }> {
  const admin = createAdminClient();
  const columns = "id, email, name, favourite_club, league_name, league_claimed_at";
  const own = (await admin.from("waitlist").select(columns).eq("email", to.toLowerCase()).maybeSingle()).data as Row | null;
  const first = own ?? ((await admin.from("waitlist").select(columns).order("id").limit(1).maybeSingle()).data as Row | null);
  const row: Row = first ?? { id: 1, email: to, name: "collinsCFC", favourite_club: null, league_name: "Lekki Ballers", league_claimed_at: null };
  const [places, fixture] = await Promise.all([positions(), todaysFixture()]);
  return { ...emailFor(row, places.get(row.id) ?? 1, fixture), to };
}

/** A test send to an admin, not marked as sent. */
export async function sendTestLaunchEmail(to: string): Promise<void> {
  const e = await sampleLaunchEmail(to);
  await sendBatch([{ ...message(e), subject: `[Test] ${launchSubject(e)}` }], `launch-email-test/${Date.now()}`);
}
