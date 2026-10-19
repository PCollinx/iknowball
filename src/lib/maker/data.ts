import "server-only";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { currentUserId } from "@/lib/daily/data";
import type { DailyFormat } from "@/lib/daily/score";

// Data access for the Daily maker. Every read goes through requireAdmin first:
// the maker shows answer keys, so a page or action that skips it leaks them.

export async function isAdmin(userId: string): Promise<boolean> {
  const { data } = await createAdminClient().from("profiles").select("is_admin").eq("id", userId).maybeSingle();
  return data?.is_admin === true;
}

/** The signed-in admin's id. Anyone else is sent to the maker's sign-in page. */
export async function requireAdmin(): Promise<string> {
  const userId = await currentUserId();
  if (!userId || !(await isAdmin(userId))) redirect("/maker/login");
  return userId;
}

export type MakerPart = {
  id: number;
  part: number;
  format: DailyFormat;
  title: string;
  prompt: string;
  time_limit_seconds: number;
  answer_count: number;
  status: "draft" | "scheduled";
  source_note: string | null;
  plays: number;
};

async function playCounts(ids: number[]): Promise<Map<number, number>> {
  if (!ids.length) return new Map();
  const { data, error } = await createAdminClient().from("daily_play_counts").select("daily_id, plays").in("daily_id", ids);
  if (error) throw error;
  return new Map((data ?? []).map((r) => [r.daily_id as number, r.plays as number]));
}

const PART_COLUMNS = "id, play_date, part, format, title, prompt, time_limit_seconds, answer_count, status, source_note";

/** Every part dated between two game dates (inclusive), by date. */
export async function listParts(from: string, to: string): Promise<Map<string, MakerPart[]>> {
  const { data, error } = await createAdminClient()
    .from("dailies")
    .select(PART_COLUMNS)
    .gte("play_date", from)
    .lte("play_date", to)
    .order("play_date")
    .order("part");
  if (error) throw error;
  const plays = await playCounts((data ?? []).map((d) => d.id));
  const days = new Map<string, MakerPart[]>();
  for (const d of data ?? []) {
    days.set(d.play_date, [...(days.get(d.play_date) ?? []), { ...d, plays: plays.get(d.id) ?? 0 } as MakerPart]);
  }
  return days;
}

export type MakerAnswer = {
  answer_text: string;
  extra_aliases: string[];
  reveal_note: string | null;
  question: string | null;
  choices: string[];
};
export type MakerDay = { parts: (MakerPart & { answers: MakerAnswer[] })[] };

export async function getDay(date: string): Promise<MakerDay> {
  const parts = (await listParts(date, date)).get(date) ?? [];
  if (!parts.length) return { parts: [] };
  const { data, error } = await createAdminClient()
    .from("daily_answers")
    .select("daily_id, position, answer_text, extra_aliases, reveal_note, question, choices")
    .in("daily_id", parts.map((p) => p.id))
    .order("position", { nullsFirst: true })
    .order("id");
  if (error) throw error;
  return {
    parts: parts.map((p) => ({
      ...p,
      answers: (data ?? [])
        .filter((a) => a.daily_id === p.id)
        .map((a) => ({
          answer_text: a.answer_text,
          extra_aliases: a.extra_aliases ?? [],
          reveal_note: a.reveal_note,
          question: a.question,
          choices: a.choices ?? [],
        })),
    })),
  };
}
