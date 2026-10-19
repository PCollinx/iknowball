"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureUserId } from "@/lib/supabase/guest";
import { currentUserId } from "@/lib/daily/data";
import { cardOf, createSet, getSet, isLastAnswer, isRunOpen, type Card, type RunRow, type SetRow } from "@/lib/clash/data";
import { afterAnswer, isRight, PENALTY_SECONDS, SPRINT_SECONDS, type Guess } from "@/lib/clash/rules";

// Every action re-reads the player from the session and the run from the
// database: the browser only sends a run id and its call.

const code = z.string().regex(/^[A-Z0-9]{6}$/);

/** Starts a sprint: a new set for a solo sprint, or the challenge's set from a link. */
export async function startSprint(formData: FormData) {
  const userId = await ensureUserId();
  const given = formData.get("code");
  const set = given ? await getSet(code.parse(given)) : await createSet(userId);
  if (!set) throw new Error("That challenge doesn't exist.");

  const now = Date.now();
  await createAdminClient()
    .from("clash_runs")
    .upsert(
      {
        set_id: set.id,
        user_id: userId,
        started_at: new Date(now).toISOString(),
        deadline_at: new Date(now + SPRINT_SECONDS * 1000).toISOString(),
      },
      { onConflict: "set_id,user_id", ignoreDuplicates: true },
    );
  redirect(`/clash/${set.code}`);
}

export type AnswerResult =
  | { status: "closed" }
  | { status: "answered"; right: boolean; value: number; deadlineAt: string; done: boolean; upcoming: Card | null };

/** Checks one call against the set and moves the run on. A wrong call takes
 * PENALTY_SECONDS off the clock. */
export async function answerClash(runId: number, guess: Guess): Promise<AnswerResult> {
  const parsed = z.object({ runId: z.number().int().positive(), guess: z.enum(["more", "fewer", "level"]) }).safeParse({ runId, guess });
  if (!parsed.success) return { status: "closed" };
  const userId = await currentUserId();
  if (!userId) return { status: "closed" };

  const admin = createAdminClient();
  const { data } = await admin
    .from("clash_runs")
    .select("*, clash_sets!inner(id, code, stat, items, created_by)")
    .eq("id", parsed.data.runId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) return { status: "closed" };
  const { clash_sets: set, ...run } = data as RunRow & { clash_sets: SetRow };
  if (!isRunOpen(run) || run.answered + 1 >= set.items.length) return { status: "closed" };

  const shown = set.items[run.answered];
  const next = set.items[run.answered + 1];
  const right = isRight(shown.value, next.value, parsed.data.guess);
  const state = afterAnswer(
    { answered: run.answered, right: run.right_count, currentRun: run.current_run, bestRun: run.best_run, kicks: run.kicks },
    right,
  );
  const deadlineAt = right ? run.deadline_at : new Date(Date.parse(run.deadline_at) - PENALTY_SECONDS * 1000).toISOString();
  const done = isLastAnswer(state, set) || Date.parse(deadlineAt) <= Date.now();

  // Only moves on from the answer this call saw, so a double tap counts once.
  const { data: moved } = await admin
    .from("clash_runs")
    .update({
      answered: state.answered,
      right_count: state.right,
      current_run: state.currentRun,
      best_run: state.bestRun,
      kicks: state.kicks,
      deadline_at: deadlineAt,
      ...(done ? { submitted_at: new Date(Math.min(Date.now(), Date.parse(deadlineAt))).toISOString() } : {}),
    })
    .eq("id", run.id)
    .eq("answered", run.answered)
    .select("id");
  if (!moved?.length) return { status: "closed" };

  const upcoming = set.items[state.answered + 1];
  return { status: "answered", right, value: next.value, deadlineAt, done, upcoming: upcoming && !done ? cardOf(upcoming) : null };
}

/** Full time: closes the run (the clock ran out or the player stopped) and shows the result. */
export async function endSprint(runId: number) {
  const userId = await currentUserId();
  if (!userId) return;
  await createAdminClient()
    .from("clash_runs")
    .update({ submitted_at: new Date().toISOString() })
    .eq("id", runId)
    .eq("user_id", userId)
    .is("submitted_at", null);
  refresh();
}
