import "server-only";
import { cache } from "react";
import type { User } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { gameDate } from "@/lib/time";
import { buildKeys, type AnswerKeys } from "./match";
import { seededShuffle, topPercent, type DailyFormat } from "./score";

// Data access for The Daily. Reads the answer key and writes attempts with the
// service role, always scoped to the signed-in player, so the browser only
// ever receives what the current screen needs.

/** Answers that arrive this long after the deadline still count (network lag). */
export const GRACE_MS = 3000;
/** Upper bound on guesses per attempt, so the key can't be brute-forced. */
export const MAX_GUESSES = 200;

export type DailyRow = {
  id: number;
  play_date: string;
  part: number;
  format: DailyFormat;
  title: string;
  prompt: string;
  time_limit_seconds: number;
  answer_count: number;
};

export type AttemptRow = {
  id: number;
  daily_id: number;
  user_id: string;
  started_at: string;
  deadline_at: string;
  submitted_at: string | null;
  correct_count: number;
  score: number;
};

export type AnswerRow = {
  id: number;
  position: number | null;
  answer_text: string;
  extra_aliases: string[];
  reveal_note: string | null;
  player_id: number | null;
};

const DAILY_COLUMNS = "id, play_date, part, format, title, prompt, time_limit_seconds, answer_count";

/** The signed-in player or guest, checked with Supabase once per request. */
export const currentUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
});

export async function currentUserId(): Promise<string | null> {
  return (await currentUser())?.id ?? null;
}

export async function todaysParts(): Promise<DailyRow[]> {
  const { data, error } = await createAdminClient()
    .from("dailies")
    .select(DAILY_COLUMNS)
    .eq("play_date", gameDate())
    .eq("status", "scheduled")
    .order("part");
  if (error) throw error;
  return (data ?? []) as DailyRow[];
}

/** The Daily's issue number: how many days have had a Daily, today included. */
export async function issueNumber(): Promise<number> {
  const { data, error } = await createAdminClient()
    .from("dailies")
    .select("play_date")
    .eq("status", "scheduled")
    .eq("part", 1)
    .lte("play_date", gameDate());
  if (error) throw error;
  return data?.length ?? 0;
}

export async function getDaily(id: number): Promise<DailyRow | null> {
  const { data } = await createAdminClient().from("dailies").select(DAILY_COLUMNS).eq("id", id).maybeSingle();
  return (data as DailyRow | null) ?? null;
}

export async function getAnswers(dailyId: number): Promise<AnswerRow[]> {
  const { data, error } = await createAdminClient()
    .from("daily_answers")
    .select("id, position, answer_text, extra_aliases, reveal_note, player_id")
    .eq("daily_id", dailyId)
    .order("id");
  if (error) throw error;
  return (data ?? []) as AnswerRow[];
}

/** Match keys for each answer: its text, its own aliases and its player's aliases. */
export async function getAnswerKeys(answers: AnswerRow[]): Promise<AnswerKeys[]> {
  const playerIds = answers.map((a) => a.player_id).filter((id): id is number => id !== null);
  const aliases = new Map<number, string[]>();
  if (playerIds.length) {
    const admin = createAdminClient();
    const [{ data: rows }, { data: players }] = await Promise.all([
      admin.from("player_aliases").select("player_id, alias").in("player_id", playerIds),
      admin.from("players").select("id, full_name, known_as").in("id", playerIds),
    ]);
    for (const r of rows ?? []) aliases.set(r.player_id, [...(aliases.get(r.player_id) ?? []), r.alias]);
    for (const p of players ?? []) aliases.set(p.id, [...(aliases.get(p.id) ?? []), p.full_name, p.known_as]);
  }
  return buildKeys(
    answers.map((a) => ({
      id: a.id,
      text: a.answer_text,
      aliases: [...a.extra_aliases, ...(a.player_id ? aliases.get(a.player_id) ?? [] : [])],
    })),
  );
}

export async function getAttempt(attemptId: number, userId: string): Promise<AttemptRow | null> {
  const { data } = await createAdminClient()
    .from("attempts")
    .select("*")
    .eq("id", attemptId)
    .eq("user_id", userId)
    .maybeSingle();
  return (data as AttemptRow | null) ?? null;
}

export function isOpen(attempt: AttemptRow, now = Date.now()): boolean {
  return !attempt.submitted_at && now <= Date.parse(attempt.deadline_at) + GRACE_MS;
}

/** Closes an attempt whose clock ran out without a submit, at its deadline. */
async function closeIfExpired(attempt: AttemptRow): Promise<AttemptRow> {
  if (attempt.submitted_at || isOpen(attempt)) return attempt;
  const submitted_at = attempt.deadline_at;
  await createAdminClient().from("attempts").update({ submitted_at }).eq("id", attempt.id).is("submitted_at", null);
  return { ...attempt, submitted_at };
}

async function attemptsFor(userId: string, dailyIds: number[]): Promise<Map<number, AttemptRow>> {
  if (!dailyIds.length) return new Map();
  const { data, error } = await createAdminClient()
    .from("attempts")
    .select("*")
    .eq("user_id", userId)
    .in("daily_id", dailyIds);
  if (error) throw error;
  const closed = await Promise.all(((data ?? []) as AttemptRow[]).map(closeIfExpired));
  return new Map(closed.map((a) => [a.daily_id, a]));
}

/** Correct answers found so far, in the order the player found them. */
export async function foundAnswerIds(attemptId: number): Promise<number[]> {
  const { data, error } = await createAdminClient()
    .from("attempt_guesses")
    .select("answer_id")
    .eq("attempt_id", attemptId)
    .not("answer_id", "is", null)
    .order("id");
  if (error) throw error;
  return [...new Set((data ?? []).map((r) => r.answer_id as number))];
}

// ---------------------------------------------------------------------------
// What the /daily page shows right now
// ---------------------------------------------------------------------------

type Shown = { id: number; text: string };

export type RecallReveal = {
  daily: DailyRow;
  found: Shown[];
  missed: string[];
  timeUsedSeconds: number;
  score: number;
};

export type OrderReveal = {
  daily: DailyRow;
  slots: { placed: string; correct: string; note: string | null; right: boolean }[];
  correct: number;
  score: number;
};

export type DailyView =
  | { kind: "none" }
  | { kind: "kickoff"; issue: number; daily: DailyRow; total: number; before: RecallReveal | null }
  | { kind: "recall"; issue: number; daily: DailyRow; attemptId: number; deadlineAt: string; serverNow: number; found: Shown[] }
  | { kind: "order"; issue: number; daily: DailyRow; attemptId: number; deadlineAt: string; serverNow: number; items: Shown[] }
  | {
      kind: "fulltime";
      issue: number;
      playDate: string;
      recall: RecallReveal | null;
      order: OrderReveal | null;
      points: number;
      topPercent: number | null;
    };

async function recallReveal(daily: DailyRow, attempt: AttemptRow): Promise<RecallReveal> {
  const [answers, foundIds] = await Promise.all([getAnswers(daily.id), foundAnswerIds(attempt.id)]);
  const byId = new Map(answers.map((a) => [a.id, a.answer_text]));
  return {
    daily,
    found: foundIds.map((id) => ({ id, text: byId.get(id) ?? "" })),
    missed: answers.filter((a) => !foundIds.includes(a.id)).map((a) => a.answer_text),
    timeUsedSeconds: Math.round((Date.parse(attempt.submitted_at!) - Date.parse(attempt.started_at)) / 1000),
    score: attempt.score,
  };
}

async function orderReveal(daily: DailyRow, attempt: AttemptRow): Promise<OrderReveal> {
  const answers = (await getAnswers(daily.id)).sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  const { data } = await createAdminClient()
    .from("attempt_guesses")
    .select("raw_input, answer_id")
    .eq("attempt_id", attempt.id);
  const placedAt = new Map((data ?? []).map((g) => [Number(g.raw_input), g.answer_id as number | null]));
  const byId = new Map(answers.map((a) => [a.id, a.answer_text]));
  const slots = answers.map((a, i) => {
    const placedId = placedAt.get(i + 1) ?? null;
    return {
      placed: placedId ? byId.get(placedId) ?? "" : "",
      correct: a.answer_text,
      note: a.reveal_note,
      right: placedId === a.id,
    };
  });
  return { daily, slots, correct: attempt.correct_count, score: attempt.score };
}

async function todaysTopPercent(dailyIds: number[], userId: string): Promise<number | null> {
  const { data } = await createAdminClient()
    .from("attempts")
    .select("user_id, score")
    .in("daily_id", dailyIds)
    .not("submitted_at", "is", null);
  const totals = new Map<string, number>();
  for (const r of data ?? []) totals.set(r.user_id, (totals.get(r.user_id) ?? 0) + r.score);
  const mine = totals.get(userId);
  return mine === undefined ? null : topPercent(mine, [...totals.values()]);
}

export async function getDailyView(): Promise<DailyView> {
  const parts = await todaysParts();
  if (!parts.length) return { kind: "none" };
  const [issue, userId] = await Promise.all([issueNumber(), currentUserId()]);
  const attempts = userId ? await attemptsFor(userId, parts.map((p) => p.id)) : new Map<number, AttemptRow>();
  const serverNow = Date.now();

  let before: RecallReveal | null = null;
  for (const daily of parts) {
    const attempt = attempts.get(daily.id);
    if (!attempt) return { kind: "kickoff", issue, daily, total: parts.length, before };
    if (!attempt.submitted_at) {
      if (daily.format === "free_recall") {
        const answers = await getAnswers(daily.id);
        const byId = new Map(answers.map((a) => [a.id, a.answer_text]));
        const found = (await foundAnswerIds(attempt.id)).map((id) => ({ id, text: byId.get(id) ?? "" }));
        return { kind: "recall", issue, daily, attemptId: attempt.id, deadlineAt: attempt.deadline_at, serverNow, found };
      }
      const items = seededShuffle(
        (await getAnswers(daily.id)).map((a) => ({ id: a.id, text: a.answer_text })),
        attempt.id,
      );
      return { kind: "order", issue, daily, attemptId: attempt.id, deadlineAt: attempt.deadline_at, serverNow, items };
    }
    if (daily.format === "free_recall") before = await recallReveal(daily, attempt);
  }

  const recallPart = parts.find((p) => p.format === "free_recall");
  const orderPart = parts.find((p) => p.format === "in_order");
  const [recall, order, top] = await Promise.all([
    recallPart ? recallReveal(recallPart, attempts.get(recallPart.id)!) : null,
    orderPart ? orderReveal(orderPart, attempts.get(orderPart.id)!) : null,
    todaysTopPercent(parts.map((p) => p.id), userId!),
  ]);
  return {
    kind: "fulltime",
    issue,
    playDate: parts[0].play_date,
    recall,
    order,
    points: (recall?.score ?? 0) + (order?.score ?? 0),
    topPercent: top,
  };
}
