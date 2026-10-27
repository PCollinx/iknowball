"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureUserId } from "@/lib/supabase/guest";
import { gameDate } from "@/lib/time";
import {
  cachedAnswerKeys,
  currentUserId,
  getAnswers,
  getAttempt,
  getDaily,
  GRACE_MS,
  isOpen,
  MAX_GUESSES,
  type Position,
} from "@/lib/daily/data";
import { matchAnswer } from "@/lib/daily/match";
import { clearTodaysAttempts, switchTestDaily } from "@/lib/daily/sample";
import { PART_MAX, partScore } from "@/lib/daily/score";
import type { ClockStart } from "@/components/daily/useRoundClock";

// Every action re-reads the player from the session and the attempt from the
// database: the browser only ever sends ids and what the player typed.

const id = z.coerce.number().int().positive();

/** A part's clock starts when it's on screen, at most this long after Kick off. */
const START_ALLOWANCE_SECONDS = 10;

/** Starts the clock on one part of today's Daily. Signs in a guest if needed. */
export async function startPart(formData: FormData) {
  const dailyId = id.parse(formData.get("dailyId"));
  const userId = await ensureUserId();

  const daily = await getDaily(dailyId);
  if (!daily || daily.play_date !== gameDate()) throw new Error("That Daily isn't live.");

  const admin = createAdminClient();
  if (daily.part > 1) {
    // Part 2 opens only once Part 1 is finished (or its clock has run out).
    const { data: earlier } = await admin
      .from("attempts")
      .select("submitted_at, deadline_at, dailies!inner(play_date, part)")
      .eq("user_id", userId)
      .eq("dailies.play_date", daily.play_date)
      .lt("dailies.part", daily.part);
    const done = (earlier ?? []).some((a) => a.submitted_at || Date.parse(a.deadline_at) < Date.now());
    if (!done) throw new Error("Finish Part 1 first.");
  }

  const now = Date.now();
  await admin.from("attempts").upsert(
    {
      daily_id: daily.id,
      user_id: userId,
      started_at: new Date(now).toISOString(),
      // Until the part is on screen (beginPart): the latest its clock can run to.
      deadline_at: new Date(now + (daily.time_limit_seconds + START_ALLOWANCE_SECONDS) * 1000).toISOString(),
    },
    { onConflict: "daily_id,user_id", ignoreDuplicates: true },
  );
  refresh();
}

/** Starts a part's clock once the round is on screen. Also loads the answer
 * key into this server's cache, so the first answer is as quick as the rest. */
export async function beginPart(attemptId: number, dailyId: number): Promise<ClockStart | null> {
  const parsed = z.object({ attemptId: id, dailyId: id }).safeParse({ attemptId, dailyId });
  if (!parsed.success) return null;
  const userId = await currentUserId();
  if (!userId) return null;
  const [{ data, error }] = await Promise.all([
    createAdminClient().rpc("begin_attempt", { p_attempt: parsed.data.attemptId, p_user: userId, p_allow: START_ALLOWANCE_SECONDS }),
    cachedAnswerKeys(parsed.data.dailyId),
  ]);
  if (error || !data) return null;
  return { deadlineAt: data as string, serverNow: Date.now() };
}

export type GuessResult =
  | { status: "correct"; id: number; text: string; position: Position | null; found: number; done: boolean }
  | { status: "duplicate"; text: string }
  | { status: "wrong" }
  | { status: "closed" };

/** Checks one Free Recall guess. Built for speed, since the player is racing
 * the clock: the answer key comes from this server's cache, and one database
 * call checks the attempt is theirs and open, logs the guess and moves the score. */
export async function submitGuess(attemptId: number, dailyId: number, input: string): Promise<GuessResult> {
  const parsed = z.object({ attemptId: id, dailyId: id, input: z.string().trim().min(1).max(60) }).safeParse({ attemptId, dailyId, input });
  if (!parsed.success) return { status: "wrong" };
  const [userId, { daily, answers, keys, positions }] = await Promise.all([currentUserId(), cachedAnswerKeys(parsed.data.dailyId)]);
  if (!userId || !daily) return { status: "closed" };

  const matched = matchAnswer(parsed.data.input, keys);
  const { data } = await createAdminClient().rpc("daily_guess", {
    p_attempt: parsed.data.attemptId,
    p_user: userId,
    p_daily: daily.id,
    p_input: parsed.data.input,
    p_answer: matched,
    p_answers: answers.length,
    p_part_max: PART_MAX[daily.part] ?? 0,
    p_max_guesses: MAX_GUESSES,
    p_grace_ms: GRACE_MS,
  });
  const row = (data as { r_status: string; r_found: number; r_done: boolean }[] | null)?.[0];
  if (!row || row.r_status === "closed") return { status: "closed" };
  if (row.r_status === "wrong" || matched === null) return { status: "wrong" };
  const text = answers.find((a) => a.id === matched)!.answer_text;
  if (row.r_status === "duplicate") return { status: "duplicate", text };
  return { status: "correct", id: matched, text, position: positions.get(matched) ?? null, found: row.r_found, done: row.r_done };
}

export type PickResult = { status: "answered"; right: boolean; answer: string; done: boolean } | { status: "closed" };

/** Records one Rapid or Era picks tap. Each question takes one tap, checked here
 * against the cached answer key; one database call records it. */
export async function submitPick(attemptId: number, dailyId: number, questionId: number, choice: string): Promise<PickResult> {
  const parsed = z
    .object({ attemptId: id, dailyId: id, questionId: id, choice: z.string().min(1).max(60) })
    .safeParse({ attemptId, dailyId, questionId, choice });
  if (!parsed.success) return { status: "closed" };
  const [userId, { daily, answers }] = await Promise.all([currentUserId(), cachedAnswerKeys(parsed.data.dailyId)]);
  if (!userId || !daily) return { status: "closed" };
  const question = answers.find((a) => a.id === parsed.data.questionId);
  if (!question || !question.choices.includes(parsed.data.choice)) return { status: "closed" };

  const { data } = await createAdminClient().rpc("daily_pick", {
    p_attempt: parsed.data.attemptId,
    p_user: userId,
    p_daily: daily.id,
    p_question: question.id,
    p_choice: parsed.data.choice,
    p_answers: answers.length,
    p_part_max: PART_MAX[daily.part] ?? 0,
    p_grace_ms: GRACE_MS,
  });
  const row = (data as { r_status: string; r_choice: string; r_done: boolean }[] | null)?.[0];
  if (!row || row.r_status === "closed") return { status: "closed" };
  // A question already answered keeps its first tap.
  return { status: "answered", right: row.r_choice === question.answer_text, answer: question.answer_text, done: row.r_done };
}

/** Ends a part early ("give up"), or closes it when the clock hits zero. */
export async function endPart(attemptId: number) {
  const userId = await currentUserId();
  if (!userId) return;
  const attempt = await getAttempt(id.parse(attemptId), userId);
  if (!attempt || attempt.submitted_at) return refresh();
  const now = Date.now();
  const deadline = Date.parse(attempt.deadline_at);
  await createAdminClient()
    .from("attempts")
    .update({ submitted_at: new Date(Math.min(now, deadline)).toISOString() })
    .eq("id", attempt.id)
    .is("submitted_at", null);
  refresh();
}

/** Locks in an In Order answer: the answer ids from top to bottom. */
export async function submitOrder(attemptId: number, order: number[]) {
  const userId = await currentUserId();
  if (!userId) return;
  const attempt = await getAttempt(id.parse(attemptId), userId);
  if (!attempt || attempt.submitted_at) return refresh();
  const daily = await getDaily(attempt.daily_id);
  if (!daily || daily.format !== "in_order") return;

  const answers = (await getAnswers(daily.id)).sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  const ids = new Set(answers.map((a) => a.id));
  // Late, partial or tampered orders are kept only for the slots that are valid.
  const placed = isOpen(attempt)
    ? z.array(id).max(answers.length).parse(order).filter((x, i, all) => ids.has(x) && all.indexOf(x) === i)
    : [];
  const correct = placed.filter((x, i) => answers[i]?.id === x).length;

  const admin = createAdminClient();
  // Close the attempt first; only the request that closes it records the order.
  const { data: closed } = await admin
    .from("attempts")
    .update({
      correct_count: correct,
      score: partScore(daily.part, correct, answers.length),
      submitted_at: new Date(Math.min(Date.now(), Date.parse(attempt.deadline_at))).toISOString(),
    })
    .eq("id", attempt.id)
    .is("submitted_at", null)
    .select("id");
  if (closed?.length && placed.length) {
    await admin
      .from("attempt_guesses")
      .insert(placed.map((answerId, i) => ({ attempt_id: attempt.id, raw_input: String(i + 1), answer_id: answerId })));
  }
  refresh();
}

/** Test sites only: clears your tries at today's Daily so you can play again. */
export async function replayToday() {
  const userId = await currentUserId();
  if (userId) await clearTodaysAttempts(userId);
  refresh();
}

/** Test sites only: swaps today's Daily for the sample with the tapped or typed rounds. */
export async function switchTestRounds(formData: FormData) {
  const kind = formData.get("kind") === "typed" ? "typed" : "picks";
  await switchTestDaily(kind);
  refresh();
}
