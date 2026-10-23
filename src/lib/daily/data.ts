import "server-only";
import type { Position } from "@/lib/drafts/wikidata";
import { cache } from "react";
import type { User } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { CLUB_COLUMNS, clubChoices, getSupporter } from "@/lib/profile/data";
import type { Club } from "@/lib/profile/club";
import { gameDate } from "@/lib/time";
import { buildKeys, type AnswerKeys } from "./match";
import { ensureTestDaily, isTestSite } from "./sample";
import { partScore, rankTable, seededShuffle, topPercent, type DailyFormat } from "./score";
import { SAMPLE_LEAGUES, sampleMembers, sampleRows } from "./table";

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

/** Where on the pitch a Free Recall answer goes. */
export type { Position };

/**
 * Each answer's position, from its linked player or else a player of the same
 * name ("Ashley Cole"). Answers with no known position are left out.
 */
export async function answerPositions(answers: AnswerRow[]): Promise<Map<number, Position>> {
  const out = new Map<number, Position>();
  if (!answers.length) return out;
  const admin = createAdminClient();
  const ids = answers.map((a) => a.player_id).filter((id): id is number => id !== null);
  const names = [...new Set(answers.filter((a) => a.player_id === null).map((a) => a.answer_text))];
  const select = "id, full_name, known_as, position";
  const [byId, byKnown, byFull] = await Promise.all([
    ids.length ? admin.from("players").select(select).in("id", ids).not("position", "is", null) : null,
    names.length ? admin.from("players").select(select).in("known_as", names).not("position", "is", null) : null,
    names.length ? admin.from("players").select(select).in("full_name", names).not("position", "is", null) : null,
  ]);
  type Row = { id: number; full_name: string; known_as: string; position: Position };
  const rows = [byId, byKnown, byFull].flatMap((r) => (r?.data ?? []) as Row[]);
  const ofId = new Map(rows.map((r) => [r.id, r.position]));
  const ofName = new Map<string, Position>();
  for (const r of rows) {
    for (const n of [r.known_as, r.full_name]) if (!ofName.has(n.toLowerCase())) ofName.set(n.toLowerCase(), r.position);
  }
  for (const a of answers) {
    const p = (a.player_id !== null ? ofId.get(a.player_id) : undefined) ?? ofName.get(a.answer_text.toLowerCase());
    if (p) out.set(a.id, p);
  }
  return out;
}

const KEY_TTL_MS = 10 * 60 * 1000;
const keyCache = new Map<number, { at: number; answers: AnswerRow[]; keys: AnswerKeys[]; positions: Map<number, Position> }>();

/** The answers and their match keys for a Daily, kept for a few minutes. */
export async function cachedAnswerKeys(dailyId: number): Promise<{ answers: AnswerRow[]; keys: AnswerKeys[]; positions: Map<number, Position> }> {
  const hit = keyCache.get(dailyId);
  if (hit && Date.now() - hit.at < KEY_TTL_MS) return hit;
  const answers = await getAnswers(dailyId);
  const [keys, positions] = await Promise.all([getAnswerKeys(answers), answerPositions(answers)]);
  const entry = { at: Date.now(), answers, keys, positions };
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
/** A found Free Recall answer, with its position once known. */
export type Found = Shown & { position: Position | null };

export type RecallReveal = {
  daily: DailyRow;
  /** With positions, so full time can line the squad up on the pitch. */
  found: Found[];
  missed: Found[];
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
  | { kind: "recall"; issue: number; daily: DailyRow; attemptId: number; deadlineAt: string; serverNow: number; found: Found[] }
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
      /** Today's top three, and your own row (both parts' time in `seconds`). */
      top: TableRow[];
      me: TableRow | null;
    };

async function recallReveal(daily: DailyRow, attempt: AttemptRow): Promise<RecallReveal> {
  const timeUsedSeconds = Math.round((Date.parse(attempt.submitted_at!) - Date.parse(attempt.started_at)) / 1000);
  if (daily.format === "pick") {
    // The same squad as Free Recall: the players you picked right, then the rest.
    const [results, { positions }] = await Promise.all([pickResults(daily, attempt), cachedAnswerKeys(daily.id)]);
    return {
      daily,
      found: results.filter((r) => r.right).map((r) => ({ id: r.answer.id, text: r.answer.answer_text, position: positions.get(r.answer.id) ?? null })),
      missed: results.filter((r) => !r.right).map((r) => ({ id: r.answer.id, text: r.answer.answer_text, position: positions.get(r.answer.id) ?? null })),
      timeUsedSeconds,
      score: partScore(daily.part, attempt.correct_count, daily.answer_count),
    };
  }
  const [{ answers, positions }, foundIds] = await Promise.all([cachedAnswerKeys(daily.id), foundAnswerIds(attempt.id)]);
  const byId = new Map(answers.map((a) => [a.id, a.answer_text]));
  return {
    daily,
    found: foundIds.map((id) => ({ id, text: byId.get(id) ?? "", position: positions.get(id) ?? null })),
    missed: answers.filter((a) => !foundIds.includes(a.id)).map((a) => ({ id: a.id, text: a.answer_text, position: positions.get(a.id) ?? null })),
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
  club: Club | null;
  /** Each half's points, null when that part isn't finished. */
  p1: number | null;
  p2: number | null;
  score: number;
  seconds: number;
  /** Parts finished today. */
  parts: number;
  position: number;
};

type TableAttempt = {
  id: number;
  user_id: string;
  daily_id: number;
  correct_count: number;
  started_at: string;
  submitted_at: string;
  profiles: { username: string | null; club: Club | null } | null;
};

/** A guest without a username, named so the same guest reads the same every day. */
export const guestName = (userId: string) => `Guest ${userId.replace(/-/g, "").slice(0, 4).toUpperCase()}`;

/** Rows per request: Supabase returns at most 1000 at a time. */
const PAGE = 1000;

/** Today's table: every player with a finished part, scored out of 100. Scores
 * are worked out from right answers, so attempts saved before the day score
 * (19 Oct 2026) rank on the same scale. */
export async function dayTable(parts: DailyRow[]): Promise<TableRow[]> {
  if (!parts.length) return [];
  const byId = new Map(parts.map((p) => [p.id, p]));
  const attempts: TableAttempt[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await createAdminClient()
      .from("attempts")
      .select(`id, user_id, daily_id, correct_count, started_at, submitted_at, profiles(username, club:clubs(${CLUB_COLUMNS}))`)
      .in("daily_id", parts.map((p) => p.id))
      .not("submitted_at", "is", null)
      .order("id")
      .range(from, from + PAGE - 1);
    if (error) throw error;
    attempts.push(...((data ?? []) as unknown as TableAttempt[]));
    if (!data || data.length < PAGE) break;
  }
  const players = new Map<string, Omit<TableRow, "position">>();
  for (const a of attempts) {
    const daily = byId.get(a.daily_id)!;
    const row = players.get(a.user_id) ?? {
      userId: a.user_id,
      name: a.profiles?.username ?? guestName(a.user_id),
      club: a.profiles?.club ?? null,
      p1: null,
      p2: null,
      score: 0,
      seconds: 0,
      parts: 0,
    };
    const points = partScore(daily.part, a.correct_count, daily.answer_count);
    if (daily.part === 1) row.p1 = points;
    else row.p2 = points;
    row.score += points;
    row.seconds += Math.max(0, Math.round((Date.parse(a.submitted_at) - Date.parse(a.started_at)) / 1000));
    row.parts += 1;
    players.set(a.user_id, row);
  }
  return rankTable([...players.values()]);
}

/** A league you're in, with its members, for a tab on today's table. */
export type TableLeague = { code: string; name: string; members: string[] };

export type DayTable = {
  issue: number;
  playDate: string;
  title: string;
  parts: number;
  rows: TableRow[];
  me: string | null;
  leagues: TableLeague[];
  /** Your club, for the fans tab. */
  club: Club | null;
  /** Filled with sample players (test sites only). */
  sample: boolean;
};

/** Today's parts and table, for the table page, with your leagues and club for
 * its tabs. `sample` fills it with made-up players on test sites (never saved). */
export async function getDayTable(sample = false): Promise<DayTable | null> {
  await ensureTestDaily();
  const parts = await todaysParts();
  if (!parts.length) return null;
  const [issue, me, real] = await Promise.all([issueNumber(), currentUserId(), dayTable(parts)]);
  const [leagues, supporter] = me ? await Promise.all([myLeagues(me), getSupporter(me)]) : [[], null];
  const club = supporter?.club ?? null;
  const filled = sample && isTestSite();
  const rows = filled ? rankTable([...real, ...sampleRows(await clubChoices(), club)]) : real;
  return {
    issue,
    playDate: parts[0].play_date,
    title: parts.find((p) => p.part === 1)?.title ?? parts[0].title,
    parts: parts.length,
    rows,
    me,
    leagues: filled
      ? [
          ...leagues.map((l, i) => ({ ...l, members: [...l.members, ...sampleMembers(i)] })),
          ...SAMPLE_LEAGUES.map((name, i) => ({ code: `sample-${i}`, name, members: [...(me ? [me] : []), ...sampleMembers(leagues.length + i)] })),
        ]
      : leagues,
    club,
    sample: filled,
  };
}

/** Your leagues, oldest first, each with everyone in it. */
async function myLeagues(me: string): Promise<TableLeague[]> {
  const admin = createAdminClient();
  const { data, error } = await admin.from("league_members").select("leagues(id, name, invite_code)").eq("user_id", me).order("joined_at");
  if (error) throw error;
  const leagues = ((data ?? []) as unknown as { leagues: { id: number; name: string; invite_code: string } | null }[])
    .map((m) => m.leagues)
    .filter((l) => l !== null);
  if (!leagues.length) return [];
  const members = await admin.from("league_members").select("league_id, user_id").in("league_id", leagues.map((l) => l.id));
  if (members.error) throw members.error;
  return leagues.map((l) => ({
    code: l.invite_code,
    name: l.name,
    members: (members.data ?? []).filter((m) => m.league_id === l.id).map((m) => m.user_id),
  }));
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
        const [{ answers, positions }, foundIds] = await Promise.all([cachedAnswerKeys(daily.id), foundAnswerIds(attempt.id)]);
        const byId = new Map(answers.map((a) => [a.id, a.answer_text]));
        // Positions go to the browser only for answers already found.
        const found = foundIds.map((id) => ({ id, text: byId.get(id) ?? "", position: positions.get(id) ?? null }));
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
    top: table.slice(0, 3),
    me: mine ?? null,
  };
}
