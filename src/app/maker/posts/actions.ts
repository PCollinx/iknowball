"use server";

import { refresh } from "next/cache";
import { requireAdmin } from "@/lib/maker/data";
import { isPostKind, X_LIMIT } from "@/lib/posts/plan";
import { createAdminClient } from "@/lib/supabase/admin";

// The Posts tab's buttons: mark a post posted or skipped (or undo it), and
// keep words edited by hand. Admins only.

const DATE = /^\d{4}-\d{2}-\d{2}$/;

async function save(date: string, kind: string, change: { status?: "posted" | "skipped" | null; words?: string | null }) {
  await requireAdmin();
  if (!DATE.test(date) || !isPostKind(kind)) throw new Error("No such post.");
  const { error } = await createAdminClient()
    .from("x_posts")
    .upsert({ play_date: date, kind, ...change, updated_at: new Date().toISOString() }, { onConflict: "play_date,kind" });
  if (error) throw error;
  refresh();
}

export async function markPost(date: string, kind: string, status: "posted" | "skipped" | null) {
  await save(date, kind, { status });
}

/** Null or blank goes back to the drafted words. */
export async function saveWords(date: string, kind: string, words: string | null) {
  const text = words?.trim() || null;
  if (text && text.length > X_LIMIT * 2) throw new Error("Too long for X.");
  await save(date, kind, { words: text });
}
