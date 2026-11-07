import "server-only";
import { lastWeekFinishes } from "@/lib/league/data";
import { streak } from "@/lib/profile/stats";
import { createAdminClient } from "@/lib/supabase/admin";
import { addDays, gameDate, matchweekBounds } from "@/lib/time";
import { dailyClosing, dailyUp, leagueWeek } from "./copy";
import { blow, devicesFor, whistleReady, type BlowResult } from "./send";

// The whistle's two scheduled runs (vercel.json, logged in the control room):
// 09:00 WAT, today's Daily is up (Mondays, your league's week instead, for
// anyone who finished in one); 20:00 WAT, four hours left, for anyone yet to
// start today's Daily.

export type WhistleResult = { skipped: string } | { daily: BlowResult; league?: BlowResult };

const HOUR = 3600;

async function todaysDaily(today: string): Promise<{ id: number; title: string; prompt: string }[]> {
  const { data, error } = await createAdminClient()
    .from("dailies")
    .select("id, title, prompt, part")
    .eq("play_date", today)
    .eq("status", "scheduled")
    .order("part");
  if (error) throw error;
  return data ?? [];
}

export async function morningWhistle(): Promise<WhistleResult> {
  if (!whistleReady()) return { skipped: "No VAPID keys set." };
  const today = gameDate();
  const parts = await todaysDaily(today);
  if (!parts.length) return { skipped: `No Daily scheduled for ${today}.` };

  const daily = await devicesFor("daily");
  let league: BlowResult | undefined;
  const leagueFor = new Set<string>();
  if (matchweekBounds(today).startsOn === today) {
    const devices = await devicesFor("league");
    const finishes = await lastWeekFinishes([...new Set(devices.map((d) => d.user_id))]);
    league = await blow(
      devices.filter((d) => finishes.has(d.user_id)),
      `league:${today}`,
      (userId) => {
        const f = finishes.get(userId)!;
        return leagueWeek({ name: f.league.name, code: f.league.invite_code, position: f.position, points: f.points, leader: f.leader });
      },
      12 * HOUR,
    );
    for (const userId of finishes.keys()) leagueFor.add(userId);
  }
  // The league's buzz takes the morning's place: never two before lunch.
  const result = await blow(
    daily.filter((d) => !leagueFor.has(d.user_id)),
    `daily-up:${today}`,
    dailyUp(parts[0]),
    12 * HOUR,
  );
  return league ? { daily: result, league } : { daily: result };
}

export async function eveningWhistle(): Promise<WhistleResult> {
  if (!whistleReady()) return { skipped: "No VAPID keys set." };
  const today = gameDate();
  const parts = await todaysDaily(today);
  if (!parts.length) return { skipped: `No Daily scheduled for ${today}.` };

  const devices = await devicesFor("daily");
  const users = [...new Set(devices.map((d) => d.user_id))];
  const admin = createAdminClient();
  // Every try in the last two months: today's (started counts as played) and the streak behind it.
  const played = new Map<string, Set<string>>();
  for (let i = 0; i < users.length; i += 200) {
    const { data, error } = await admin
      .from("attempts")
      .select("user_id, dailies!inner(play_date)")
      .in("user_id", users.slice(i, i + 200))
      .gte("dailies.play_date", addDays(today, -60));
    if (error) throw error;
    for (const a of (data ?? []) as unknown as { user_id: string; dailies: { play_date: string } }[]) {
      const dates = played.get(a.user_id) ?? new Set<string>();
      dates.add(a.dailies.play_date);
      played.set(a.user_id, dates);
    }
  }
  const result = await blow(
    devices.filter((d) => !played.get(d.user_id)?.has(today)),
    `daily-closing:${today}`,
    (userId) => dailyClosing(parts[0], streak(played.get(userId) ?? [], today)),
    4 * HOUR,
  );
  return { daily: result };
}
