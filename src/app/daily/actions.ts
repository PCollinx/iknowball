"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { gameDate } from "@/lib/time";
import {
  currentUserId,
  foundAnswerIds,
  getAnswerKeys,
  getAnswers,
  getAttempt,
  getDaily,
  isOpen,
  MAX_GUESSES,
} from "@/lib/daily/data";
import { matchAnswer } from "@/lib/daily/match";
import { partScore } from "@/lib/daily/score";

// Every action re-reads the player from the session and the attempt from the
// database: the browser only ever sends ids and what the player typed.

const id = z.coerce.number().int().positive();

/** Starts the clock on one part of today's Daily. Signs in a guest if needed. */
export async function startPart(formData: FormData) {
  const dailyId = id.parse(formData.get("dailyId"));
  let userId = await currentUserId();
  if (!userId) {
    const { data, error } = await (await createClient()).auth.signInAnonymously();
    if (error || !data.user) throw new Error("Couldn't start a guest session. Try again.");
    userId = data.user.id;
  }

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
  | { status: "correct"; id: number; text: string; found: number; done: boolean }
  | { status: "duplicate"; text: string }
  | { status: "wrong" }
  | { status: "closed" };

/** Checks one Free Recall guess against the answer key. */
export async function submitGuess(attemptId: number, input: string): Promise<GuessResult> {
  const parsed = z.object({ attemptId: id, input: z.string().trim().min(1).max(60) }).safeParse({ attemptId, input });
  if (!parsed.success) return { status: "wrong" };
  const userId = await currentUserId();
  if (!userId) return { status: "closed" };
  const attempt = await getAttempt(parsed.data.attemptId, userId);
  if (!attempt || !isOpen(attempt)) return { status: "closed" };
  const daily = await getDaily(attempt.daily_id);
  if (!daily || daily.format !== "free_recall") return { status: "closed" };

  const admin = createAdminClient();
  const { count } = await admin
    .from("attempt_guesses")
    .select("id", { count: "exact", head: true })
    .eq("attempt_id", attempt.id);
  if ((count ?? 0) >= MAX_GUESSES) return { status: "closed" };

  const answers = await getAnswers(daily.id);
  const [keys, found] = await Promise.all([getAnswerKeys(answers), foundAnswerIds(attempt.id)]);
  const matched = matchAnswer(parsed.data.input, keys);
  await admin.from("attempt_guesses").insert({ attempt_id: attempt.id, raw_input: parsed.data.input, answer_id: matched });

  if (matched === null) return { status: "wrong" };
  const text = answers.find((a) => a.id === matched)!.answer_text;
  if (found.includes(matched)) return { status: "duplicate", text };

  const total = found.length + 1;
  const done = total >= answers.length;
  await admin
    .from("attempts")
    .update({
      correct_count: total,
      score: partScore("free_recall", total),
      ...(done ? { submitted_at: new Date().toISOString() } : {}),
    })
    .eq("id", attempt.id);
  return { status: "correct", id: matched, text, found: total, done };
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
      score: partScore("in_order", correct),
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
