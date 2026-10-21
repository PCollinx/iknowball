import "server-only";
import { cache } from "react";
import type { User } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { gameDate } from "@/lib/time";
import { buildKeys, type AnswerKeys } from "./match";
import { ensureTestDaily } from "./sample";
import { partScore, rankTable, seededShuffle, topPercent, type DailyFormat } from "./score";

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
  /** Rapid and Era picks: the line above the options, when there is one. */
  question: string | null;
  /** Rapid and Era picks: every option, in the order shown. */
  choices: string[];
};

const DAILY_COLUMNS = "id, play_date, part, format, title, prompt, time_limit_seconds, answer_count";

/** The signed-in player or guest, checked with Supabase once per request. */
export const currentUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
});

/** The signed-in player's id, from the session token verified on this server
 * (no call to Supabase), so answering a question stays fast. */
export const currentUserId = cache(async (): Promise<string | null> => {
  const { data } = await (await createClient()).auth.getClaims();
  return data?.claims.sub ?? null;
});

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
    .select("id, position, answer_text, extra_aliases, reveal_note, player_id, question, choices")
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

// Answer keys don't change once a part is under way (the maker locks a part as
// soon as anyone starts it), so each server keeps them for a while instead of
// reading three tables on every guess.
const KEY_TTL_MS = 10 * 60 * 1000;
const keyCache = new Map<number, { at: number; answers: AnswerRow[]; keys: AnswerKeys[] }>();

/** The answers and their match keys for a Daily, kept for a few minutes. */
export async function cachedAnswerKeys(dailyId: number): Promise<{ answers: AnswerRow[]; keys: AnswerKeys[] }> {
  const hit = keyCache.get(dailyId);
  if (hit && Date.now() - hit.at < KEY_TTL_MS) return hit;
  const answers = await getAnswers(dailyId);
  const entry = { at: Date.now(), answers, keys: await getAnswerKeys(answers) };
  if (keyCache.size > 20) keyCache.clear();
  keyCache.set(dailyId, entry);
  return entry;
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

/** Rapid and Era picks answered so far: which option was tapped for which question. */
export async function pickGuesses(attemptId: number): Promise<{ answer_id: number; raw_input: string }[]> {
  const { data, error } = await createAdminClient()
    .from("attempt_guesses")
    .select("answer_id, raw_input")
    .eq("attempt_id", attemptId)
    .not("answer_id", "is", null)
    .order("id");
  if (error) throw error;
  return (data ?? []) as { answer_id: number; raw_input: string }[];
}

/** Questions by number. */
const byPosition = (answers: AnswerRow[]) => [...answers].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

/** Each question's tapped option (or "" when it wasn't reached), in order. */
async function pickResults(daily: DailyRow, attempt: AttemptRow) {
  const [answers, guesses] = await Promise.all([getAnswers(daily.id), pickGuesses(attempt.id)]);
  const tapped = new Map(guesses.map((g) => [g.answer_id, g.raw_input]));
  return byPosition(answers).map((a) => {
    const choice = tapped.get(a.id) ?? "";
    return { answer: a, choice, right: choice === a.answer_text };
  });
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

export type PickQuestion = { id: number; question: string | null; choices: string[] };
export type PickAnswered = { id: number; choice: string; answer: string; right: boolean };

export type DailyView =
  | { kind: "none" }
  | { kind: "kickoff"; issue: number; daily: DailyRow; parts: DailyRow[]; total: number; before: RecallReveal | null }
  | { kind: "recall"; issue: number; daily: DailyRow; attemptId: number; deadlineAt: string; serverNow: number; found: Shown[] }
  | { kind: "order"; issue: number; daily: DailyRow; attemptId: number; deadlineAt: string; serverNow: number; items: Shown[] }
  | {
      kind: "pick";
      issue: number;
      daily: DailyRow;
      attemptId: number;
      deadlineAt: string;
      serverNow: number;
      questions: PickQuestion[];
      answered: PickAnswered[];
    }
  | {
      kind: "fulltime";
      issue: number;
      playDate: string;
      recall: RecallReveal | null;
      order: OrderReveal | null;
      points: number;
      topPercent: number | null;
      /** Your place in today's table, and how many are in it. */
      position: number | null;
      players: number;
    };

async function recallReveal(daily: DailyRow, attempt: AttemptRow): Promise<RecallReveal> {
  const timeUsedSeconds = Math.round((Date.parse(attempt.submitted_at!) - Date.parse(attempt.started_at)) / 1000);
  if (daily.format === "pick") {
    // The same squad as Free Recall: the players you picked right, then the rest.
    const results = await pickResults(daily, attempt);
    return {
      daily,
      found: results.filter((r) => r.right).map((r) => ({ id: r.answer.id, text: r.answer.answer_text })),
      missed: results.filter((r) => !r.right).map((r) => r.answer.answer_text),
      timeUsedSeconds,
      score: partScore(daily.part, attempt.correct_count, daily.answer_count),
    };
  }
  const [answers, foundIds] = await Promise.all([getAnswers(daily.id), foundAnswerIds(attempt.id)]);
  const byId = new Map(answers.map((a) => [a.id, a.answer_text]));
  return {
    daily,
    found: foundIds.map((id) => ({ id, text: byId.get(id) ?? "" })),
    missed: answers.filter((a) => !foundIds.includes(a.id)).map((a) => a.answer_text),
    timeUsedSeconds,
    score: partScore(daily.part, attempt.correct_count, daily.answer_count),
  };
}

async function orderReveal(daily: DailyRow, attempt: AttemptRow): Promise<OrderReveal> {
  if (daily.format === "era") {
    // A slot per question: the period you tapped against the right one.
    const results = await pickResults(daily, attempt);
    return {
      daily,
      slots: results.map((r) => ({ placed: r.choice, correct: r.answer.answer_text, note: r.answer.question, right: r.right })),
      correct: attempt.correct_count,
      score: partScore(daily.part, attempt.correct_count, daily.answer_count),
    };
  }
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
  return { daily, slots, correct: attempt.correct_count, score: partScore(daily.part, attempt.correct_count, daily.answer_count) };
}

export type TableRow = {
  userId: string;
  name: string;
  club: string | null;
  score: number;
  seconds: number;
  /** Parts finished today. */
  parts: number;
  position: number;
};

type TableAttempt = {
  user_id: string;
  daily_id: number;
  correct_count: number;
  started_at: string;
  submitted_at: string;
  profiles: { username: string | null; clubs: { short_name: string } | null } | null;
};

/** A guest without a username, named so the same guest reads the same every day. */
export const guestName = (userId: string) => `Guest ${userId.replace(/-/g, "").slice(0, 4).toUpperCase()}`;

/** Today's table: every player with a finished part, scored out of 100. Scores
 * are worked out from right answers, so attempts saved before the day score
 * (19 Oct 2026) rank on the same scale. */
export async function dayTable(parts: DailyRow[]): Promise<TableRow[]> {
  if (!parts.length) return [];
  const byId = new Map(parts.map((p) => [p.id, p]));
  const { data, error } = await createAdminClient()
    .from("attempts")
    .select("user_id, daily_id, correct_count, started_at, submitted_at, profiles(username, clubs(short_name))")
    .in("daily_id", parts.map((p) => p.id))
    .not("submitted_at", "is", null);
  if (error) throw error;
  const players = new Map<string, Omit<TableRow, "position">>();
  for (const a of (data ?? []) as unknown as TableAttempt[]) {
    const daily = byId.get(a.daily_id)!;
    const row = players.get(a.user_id) ?? {
      userId: a.user_id,
      name: a.profiles?.username ?? guestName(a.user_id),
      club: a.profiles?.clubs?.short_name ?? null,
      score: 0,
      seconds: 0,
      parts: 0,
    };
    row.score += partScore(daily.part, a.correct_count, daily.answer_count);
    row.seconds += Math.max(0, Math.round((Date.parse(a.submitted_at) - Date.parse(a.started_at)) / 1000));
    row.parts += 1;
    players.set(a.user_id, row);
  }
  return rankTable([...players.values()]);
}

/** Today's parts and table, for the table page. */
export async function getDayTable(): Promise<{ issue: number; playDate: string; title: string; parts: number; rows: TableRow[]; me: string | null } | null> {
  const parts = await todaysParts();
  if (!parts.length) return null;
  const [issue, me, rows] = await Promise.all([issueNumber(), currentUserId(), dayTable(parts)]);
  return { issue, playDate: parts[0].play_date, title: parts.find((p) => p.part === 1)?.title ?? parts[0].title, parts: parts.length, rows, me };
}

/** Today's Daily as the home page shows it: the parts, and how far you've got. */
export type HomeDaily = { issue: number; parts: DailyRow[]; status: "fresh" | "playing" | "done"; points: number };

export async function getHomeDaily(userId: string | null): Promise<HomeDaily | null> {
  await ensureTestDaily();
  const parts = await todaysParts();
  if (!parts.length) return null;
  const [issue, attempts] = await Promise.all([
    issueNumber(),
    userId ? attemptsFor(userId, parts.map((p) => p.id)) : new Map<number, AttemptRow>(),
  ]);
  const finished = parts.filter((p) => attempts.get(p.id)?.submitted_at);
  const points = finished.reduce((sum, p) => sum + partScore(p.part, attempts.get(p.id)!.correct_count, p.answer_count), 0);
  const status = finished.length === parts.length ? "done" : attempts.size ? "playing" : "fresh";
  return { issue, parts, status, points };
}

export async function getDailyView(): Promise<DailyView> {
  // Test sites never go without: they get today's drafts or a sample. This
  // runs first, since a repeat of the same read in one render is deduped.
  await ensureTestDaily();
  const parts = await todaysParts();
  if (!parts.length) return { kind: "none" };
  const [issue, userId] = await Promise.all([issueNumber(), currentUserId()]);
  const attempts = userId ? await attemptsFor(userId, parts.map((p) => p.id)) : new Map<number, AttemptRow>();
  const serverNow = Date.now();

  let before: RecallReveal | null = null;
  for (const daily of parts) {
    const attempt = attempts.get(daily.id);
    if (!attempt) return { kind: "kickoff", issue, daily, parts, total: parts.length, before };
    if (!attempt.submitted_at) {
      if (daily.format === "pick" || daily.format === "era") {
        const [answers, guesses] = await Promise.all([getAnswers(daily.id), pickGuesses(attempt.id)]);
        const byId = new Map(answers.map((a) => [a.id, a]));
        return {
          kind: "pick",
          issue,
          daily,
          attemptId: attempt.id,
          deadlineAt: attempt.deadline_at,
          serverNow,
          questions: byPosition(answers).map((a) => ({ id: a.id, question: a.question, choices: a.choices })),
          answered: guesses.map((g) => {
            const answer = byId.get(g.answer_id)?.answer_text ?? "";
            return { id: g.answer_id, choice: g.raw_input, answer, right: g.raw_input === answer };
          }),
        };
      }
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
    if (daily.part === 1) before = await recallReveal(daily, attempt);
  }

  // Part 1 (Free Recall or Rapid picks) and Part 2 (In Order or Era picks).
  const recallPart = parts.find((p) => p.part === 1);
  const orderPart = parts.find((p) => p.part === 2);
  const [recall, order, table] = await Promise.all([
    recallPart ? recallReveal(recallPart, attempts.get(recallPart.id)!) : null,
    orderPart ? orderReveal(orderPart, attempts.get(orderPart.id)!) : null,
    dayTable(parts),
  ]);
  const mine = table.find((r) => r.userId === userId);
  return {
    kind: "fulltime",
    issue,
    playDate: parts[0].play_date,
    recall,
    order,
    points: (recall?.score ?? 0) + (order?.score ?? 0),
    topPercent: mine ? topPercent(mine.score, table.map((r) => r.score)) : null,
    position: mine?.position ?? null,
    players: table.length,
  };
}
