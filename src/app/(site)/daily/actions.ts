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
  isOpen,
  MAX_GUESSES,
  type Position,
} from "@/lib/daily/data";
import { matchAnswer } from "@/lib/daily/match";
import { clearTodaysAttempts, switchTestDaily } from "@/lib/daily/sample";
import { partScore } from "@/lib/daily/score";
import { isPick } from "@/components/daily/formats";

// Every action re-reads the player from the session and the attempt from the
// database: the browser only ever sends ids and what the player typed.

const id = z.coerce.number().int().positive();

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
      deadline_at: new Date(now + daily.time_limit_seconds * 1000).toISOString(),
    },
    { onConflict: "daily_id,user_id", ignoreDuplicates: true },
  );
  refresh();
}

export type GuessResult =
  | { status: "correct"; id: number; text: string; position: Position | null; found: number; done: boolean }
  | { status: "duplicate"; text: string }
  | { status: "wrong" }
  | { status: "closed" };

/** Checks one Free Recall guess against the answer key. Built for speed, since
 * the player is racing the clock: one read for the attempt, its Daily and its
 * guesses so far, the answer key from the server's cache, and both writes at once. */
export async function submitGuess(attemptId: number, input: string): Promise<GuessResult> {
  const parsed = z.object({ attemptId: id, input: z.string().trim().min(1).max(60) }).safeParse({ attemptId, input });
  if (!parsed.success) return { status: "wrong" };
  const userId = await currentUserId();
  if (!userId) return { status: "closed" };

  const admin = createAdminClient();
  const { data: row } = await admin
    .from("attempts")
    .select("*, dailies!inner(format, part), attempt_guesses(id, answer_id)")
    .eq("id", parsed.data.attemptId)
    .eq("user_id", userId)
    .order("id", { referencedTable: "attempt_guesses" })
    .maybeSingle();
  if (!row) return { status: "closed" };
  const { dailies, attempt_guesses: guesses, ...attempt } = row;
  if (!isOpen(attempt) || dailies.format !== "free_recall") return { status: "closed" };
  if (guesses.length >= MAX_GUESSES) return { status: "closed" };

  const { answers, keys, positions } = await cachedAnswerKeys(attempt.daily_id);
  const found = [...new Set((guesses as { answer_id: number | null }[]).map((g) => g.answer_id).filter((x) => x !== null))];
  const matched = matchAnswer(parsed.data.input, keys);
  const logGuess = admin.from("attempt_guesses").insert({ attempt_id: attempt.id, raw_input: parsed.data.input, answer_id: matched });

  if (matched === null || found.includes(matched)) {
    await logGuess;
    if (matched === null) return { status: "wrong" };
    return { status: "duplicate", text: answers.find((a) => a.id === matched)!.answer_text };
  }

  const text = answers.find((a) => a.id === matched)!.answer_text;
  const total = found.length + 1;
  const done = total >= answers.length;
  await Promise.all([
    logGuess,
    admin
      .from("attempts")
      .update({
        correct_count: total,
        score: partScore(dailies.part, total, answers.length),
        ...(done ? { submitted_at: new Date().toISOString() } : {}),
      })
      .eq("id", attempt.id),
  ]);
  return { status: "correct", id: matched, text, position: positions.get(matched) ?? null, found: total, done };
}

export type PickResult = { status: "answered"; right: boolean; answer: string; done: boolean } | { status: "closed" };

/** Records one Rapid or Era picks tap. Each question takes one tap, checked here. */
export async function submitPick(attemptId: number, questionId: number, choice: string): Promise<PickResult> {
  const parsed = z.object({ attemptId: id, questionId: id, choice: z.string().min(1).max(60) }).safeParse({ attemptId, questionId, choice });
  if (!parsed.success) return { status: "closed" };
  const userId = await currentUserId();
  if (!userId) return { status: "closed" };

  const admin = createAdminClient();
  const { data: row } = await admin
    .from("attempts")
    .select("*, dailies!inner(format, part), attempt_guesses(answer_id, raw_input)")
    .eq("id", parsed.data.attemptId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!row) return { status: "closed" };
  const { dailies, attempt_guesses: tapped, ...attempt } = row;
  if (!isOpen(attempt) || !isPick(dailies.format)) return { status: "closed" };

  const { answers } = await cachedAnswerKeys(attempt.daily_id);
  const question = answers.find((a) => a.id === parsed.data.questionId);
  if (!question || !question.choices.includes(parsed.data.choice)) return { status: "closed" };
  const guesses = tapped as { answer_id: number | null; raw_input: string }[];
  const before = guesses.find((g) => g.answer_id === question.id);
  // A question already answered keeps its first tap.
  if (before) return { status: "answered", right: before.raw_input === question.answer_text, answer: question.answer_text, done: false };

  const right = parsed.data.choice === question.answer_text;
  const correct = guesses.filter((g) => answers.some((a) => a.id === g.answer_id && a.answer_text === g.raw_input)).length + (right ? 1 : 0);
  const done = guesses.length + 1 >= answers.length;
  await Promise.all([
    admin.from("attempt_guesses").insert({ attempt_id: attempt.id, raw_input: parsed.data.choice, answer_id: question.id }),
    admin
      .from("attempts")
      .update({
        correct_count: correct,
        score: partScore(dailies.part, correct, answers.length),
        ...(done ? { submitted_at: new Date().toISOString() } : {}),
      })
      .eq("id", attempt.id),
  ]);
  return { status: "answered", right, answer: question.answer_text, done };
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
