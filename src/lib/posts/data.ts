import "server-only";
import { resultCardData, type ResultCardData } from "@/components/clash/result";
import { headlineFixture } from "@/components/daily/fixture";
import { cardQuestion, shareCardData, type ShareCardData } from "@/components/daily/share";
import { weekLabel } from "@/components/league/format";
import type { Item, Stat } from "@/lib/clash/rules";
import { dayTable, guestName, type DailyRow } from "@/lib/daily/data";
import { publicEnv } from "@/lib/env";
import { currentWeek, getGlobalTable, seasonStart, weekRound } from "@/lib/league/data";
import { seasonWeeks } from "@/lib/league/season";
import { teamOfTheWeek } from "@/lib/league/standing";
import type { TeamCardData } from "@/lib/league/TeamImage";
import { kitOf } from "@/lib/profile/club";
import { clubsByIds, kitsForFixture } from "@/lib/profile/data";
import { createAdminClient } from "@/lib/supabase/admin";
import { gameDateClosesAt, addDays } from "@/lib/time";
import { clashWords, dailyOnWords, fullTimeWords, gotAway, postsOn, teamWords, type PostKind } from "./plan";

// What each post says and shows, worked out fresh from the database on every
// view (like the tables), so the 22:00 numbers are right when Collins posts.

export type PostCard = { kind: "daily"; d: ShareCardData } | { kind: "team"; d: TeamCardData } | { kind: "clash"; d: ResultCardData };

/** The drafted words and card; null words when there's nothing to post (no Daily, nobody played). */
export type Draft = { words: string | null; card: PostCard | null };

const host = (siteUrl: string) => siteUrl.replace(/^https?:\/\//, "").replace(/\/$/, "");

async function partsOn(date: string): Promise<DailyRow[]> {
  const { data, error } = await createAdminClient()
    .from("dailies")
    .select("id, play_date, part, format, title, prompt, time_limit_seconds, answer_count, template")
    .eq("play_date", date)
    .eq("status", "scheduled")
    .order("part");
  if (error) throw error;
  return (data ?? []) as DailyRow[];
}

/** How many of a Free Recall part's finishers found each answer. */
async function foundCounts(daily: DailyRow): Promise<{ name: string; found: number }[]> {
  const admin = createAdminClient();
  const answers = await admin.from("daily_answers").select("id, answer_text").eq("daily_id", daily.id);
  if (answers.error) throw answers.error;
  const found = new Map<number, Set<number>>();
  for (let from = 0; ; from += 1000) {
    const { data, error } = await admin
      .from("attempt_guesses")
      .select("attempt_id, answer_id, attempts!inner(daily_id)")
      .eq("attempts.daily_id", daily.id)
      .not("answer_id", "is", null)
      .order("id")
      .range(from, from + 999);
    if (error) throw error;
    for (const g of (data ?? []) as unknown as { attempt_id: number; answer_id: number }[]) {
      const set = found.get(g.answer_id) ?? new Set<number>();
      set.add(g.attempt_id);
      found.set(g.answer_id, set);
    }
    if (!data || data.length < 1000) break;
  }
  return (answers.data ?? []).map((a) => ({ name: a.answer_text as string, found: found.get(a.id as number)?.size ?? 0 }));
}

async function dailyDraft(kind: "daily-on" | "full-time", date: string, siteUrl: string): Promise<Draft> {
  const parts = await partsOn(date);
  const first = parts.find((p) => p.part === 1);
  if (!first) return { words: null, card: null };
  const second = parts.find((p) => p.part === 2) ?? null;
  const fixture = headlineFixture(first.title);
  const kits = await kitsForFixture(first.title);
  const card = (points: number, name: string | null, open = false): PostCard => ({
    kind: "daily",
    d: {
      ...shareCardData({
        playDate: date,
        recall: { daily: first } as never,
        order: second ? ({ daily: second } as never) : null,
        points,
        siteUrl,
        name,
        kits,
      }),
      open,
    },
  });

  if (kind === "daily-on") {
    return {
      words: dailyOnWords({ fixture, first: cardQuestion(first), second: second ? cardQuestion(second) : null, siteUrl }),
      card: card(0, null, true),
    };
  }

  const rows = await dayTable(parts);
  const top = rows[0] ?? null;
  const finishers = rows.filter((r) => r.p1 !== null).length;
  const away = first.format === "free_recall" ? gotAway(await foundCounts(first), finishers) : null;
  return {
    words: fullTimeWords({ fixture, players: rows.length, top: top && { name: top.name, points: top.score }, gotAway: away, siteUrl }),
    card: top ? card(top.score, top.name) : null,
  };
}

/** Last week's team of the week, on its Monday. */
async function teamDraft(date: string, siteUrl: string): Promise<Draft> {
  const lastN = seasonWeeks(seasonStart(date), date).length - 1;
  if (lastN < 1) return { words: null, card: null };
  const view = await getGlobalTable(String(lastN));
  const round = await weekRound(view.week);
  const top = view.top[0] ?? null;
  return {
    words: teamWords({ week: round ? `Matchweek ${round}` : `Week ${lastN}`, top: top && { name: top.name, points: top.points }, players: view.players, siteUrl }),
    card: top ? { kind: "team", d: { xi: teamOfTheWeek(view.top).xi, weekLabel: weekLabel(view.week), players: view.players, round, host: host(siteUrl) } } : null,
  };
}

type BestRun = { right_count: number; kicks: string; user_id: string; profiles: { username: string | null } | null; clash_sets: { code: string; stat: Stat; items: Item[] } | null };

/** The week's best finished sprint so far, a named player's first. */
async function clashDraft(siteUrl: string): Promise<Draft> {
  const week = currentWeek();
  const { data, error } = await createAdminClient()
    .from("clash_runs")
    .select("right_count, kicks, user_id, profiles(username), clash_sets(code, stat, items)")
    .gte("started_at", gameDateClosesAt(addDays(week.startsOn, -1)).toISOString())
    .lt("started_at", gameDateClosesAt(week.endsOn).toISOString())
    .not("submitted_at", "is", null)
    .gt("right_count", 0)
    .order("right_count", { ascending: false })
    .limit(20);
  if (error) throw error;
  const runs = (data ?? []) as unknown as BestRun[];
  const best = runs.find((r) => r.profiles?.username && r.right_count === runs[0].right_count) ?? runs[0];
  if (!best?.clash_sets) return { words: null, card: null };
  const name = best.profiles?.username ?? guestName(best.user_id);
  const set = best.clash_sets;
  const ids = [...new Set(set.items.slice(0, 5).map((i) => i.club_id).filter((id): id is number => id !== null))];
  const clubs = await clubsByIds(ids);
  return {
    words: clashWords({ name, right: best.right_count, code: set.code, siteUrl }),
    card: {
      kind: "clash",
      d: resultCardData({
        stat: set.stat,
        items: set.items,
        kicks: best.kicks,
        right: best.right_count,
        name,
        toBeat: best.right_count,
        clubs: new Map([...clubs].map(([id, c]) => [id, { name: c.name, kit: kitOf(c) }])),
        code: set.code,
        siteUrl,
      }),
    },
  };
}

export async function draftPost(kind: PostKind, date: string): Promise<Draft> {
  const siteUrl = publicEnv().NEXT_PUBLIC_SITE_URL;
  if (kind === "team") return teamDraft(date, siteUrl);
  if (kind === "clash") return clashDraft(siteUrl);
  return dailyDraft(kind, date, siteUrl);
}

export type SavedPost = { kind: PostKind; status: "posted" | "skipped" | null; words: string | null; updated_at: string };

export async function savedPosts(date: string): Promise<Map<PostKind, SavedPost>> {
  const { data, error } = await createAdminClient().from("x_posts").select("kind, status, words, updated_at").eq("play_date", date);
  if (error) throw error;
  return new Map(((data ?? []) as SavedPost[]).map((p) => [p.kind, p]));
}

/** Today's posts, each with its words (edited ones win), card and what's been done. */
export async function postsFor(date: string) {
  const kinds = postsOn(date);
  const [saved, drafts] = await Promise.all([savedPosts(date), Promise.all(kinds.map((k) => draftPost(k, date)))]);
  return kinds.map((kind, i) => {
    const s = saved.get(kind);
    return { kind, drafted: drafts[i].words, words: s?.words ?? drafts[i].words, edited: Boolean(s?.words), hasCard: drafts[i].card !== null, status: s?.status ?? null, at: s?.updated_at ?? null };
  });
}

export type TodayPost = Awaited<ReturnType<typeof postsFor>>[number];
