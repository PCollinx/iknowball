"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureUserId } from "@/lib/supabase/guest";
import { currentUserId } from "@/lib/daily/data";
import { cachedSet, cardOf, createSet, getSet, GRACE_MS, type Card } from "@/lib/clash/data";
import { isRight, PENALTY_SECONDS, SPRINT_SECONDS, type Guess } from "@/lib/clash/rules";
import type { ClockStart } from "@/components/daily/useRoundClock";

// Every action re-reads the player from the session and the run from the
// database: the browser only sends a run id and its call.

const code = z.string().regex(/^[A-Z0-9]{6}$/);

/** The clock starts when the sprint is on screen, at most this long after Kick off. */
const START_ALLOWANCE_SECONDS = 10;

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
        // Until the sprint is on screen (beginSprint): the latest the clock can run to.
        deadline_at: new Date(now + (SPRINT_SECONDS + START_ALLOWANCE_SECONDS) * 1000).toISOString(),
      },
      { onConflict: "set_id,user_id", ignoreDuplicates: true },
    );
  redirect(`/clash/${set.code}`);
}

/** Starts the sprint's clock once its first players are on screen. Also loads
 * the set into this server's cache, so the first call is as quick as the rest. */
export async function beginSprint(runId: number, setCode: string): Promise<ClockStart | null> {
  const parsed = z.object({ runId: z.number().int().positive(), setCode: code }).safeParse({ runId, setCode });
  if (!parsed.success) return null;
  const userId = await currentUserId();
  if (!userId) return null;
  const [{ data, error }] = await Promise.all([
    createAdminClient().rpc("begin_clash_run", {
      p_run: parsed.data.runId,
      p_user: userId,
      p_seconds: SPRINT_SECONDS,
      p_allow: START_ALLOWANCE_SECONDS,
    }),
    cachedSet(parsed.data.setCode),
  ]);
  if (error || !data) return null;
  return { deadlineAt: data as string, serverNow: Date.now() };
}

export type AnswerResult =
  | { status: "closed" }
  | { status: "answered"; right: boolean; value: number; deadlineAt: string; done: boolean; upcoming: Card | null };

/** Checks one call and moves the run on, in one database call: the set comes
 * from this server's cache, and `at` (the player on show, as the browser saw
 * it) must match the run, so a double tap counts once. A wrong call takes
 * PENALTY_SECONDS off the clock. */
export async function answerClash(runId: number, setCode: string, at: number, guess: Guess): Promise<AnswerResult> {
  const parsed = z
    .object({ runId: z.number().int().positive(), setCode: code, at: z.number().int().min(0), guess: z.enum(["more", "fewer", "level"]) })
    .safeParse({ runId, setCode, at, guess });
  if (!parsed.success) return { status: "closed" };
  const [userId, set] = await Promise.all([currentUserId(), cachedSet(parsed.data.setCode)]);
  if (!userId || !set) return { status: "closed" };
  const i = parsed.data.at;
  if (i + 1 >= set.items.length) return { status: "closed" };

  const next = set.items[i + 1];
  const right = isRight(set.items[i].value, next.value, parsed.data.guess);
  const { data } = await createAdminClient().rpc("clash_answer", {
    p_run: parsed.data.runId,
    p_user: userId,
    p_set: set.id,
    p_at: i,
    p_right: right,
    // After this call the player on show is i + 1; the run ends when that one has no next.
    p_last: i + 2 >= set.items.length,
    p_penalty: PENALTY_SECONDS,
    p_grace_ms: GRACE_MS,
  });
  const row = (data as { r_deadline: string; r_submitted: string | null }[] | null)?.[0];
  if (!row) return { status: "closed" };

  const done = row.r_submitted !== null;
  const upcoming = set.items[i + 2];
  return { status: "answered", right, value: next.value, deadlineAt: row.r_deadline, done, upcoming: upcoming && !done ? cardOf(upcoming) : null };
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
