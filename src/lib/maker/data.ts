import "server-only";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { currentUserId } from "@/lib/daily/data";
import type { DailyFormat } from "@/lib/daily/score";
import type { WaitlistRow } from "./waitlist";

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
  /** The template that drafted it; null for a part written in the maker. */
  template: string | null;
  plays: number;
};

async function playCounts(ids: number[]): Promise<Map<number, number>> {
  if (!ids.length) return new Map();
  const { data, error } = await createAdminClient().from("daily_play_counts").select("daily_id, plays").in("daily_id", ids);
  if (error) throw error;
  return new Map((data ?? []).map((r) => [r.daily_id as number, r.plays as number]));
}

const PART_COLUMNS = "id, play_date, part, format, title, prompt, time_limit_seconds, answer_count, status, source_note, template";

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

/** Every waitlist row, a page of 1000 at a time (Supabase's cap). Callers have passed requireAdmin: the rows hold emails. */
export async function waitlistRows(): Promise<WaitlistRow[]> {
  const admin = createAdminClient();
  const rows: WaitlistRow[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await admin
      .from("waitlist")
      .select("id, email, name, favourite_club, league_name, league_id, created_at")
      .order("id")
      .range(from, from + 999);
    if (error) throw error;
    rows.push(...data);
    if (data.length < 1000) return rows;
  }
}

/** A drafted part as the drafts job saved it in draft_options. */
export type OptionSpec = {
  format: DailyFormat;
  template: string;
  title: string;
  prompt: string;
  time_limit_seconds: number;
  source_note: string | null;
  answers: { answer_text: string; extra_aliases?: string[]; reveal_note?: string | null; question?: string | null; choices?: string[] }[];
};

/** The other templates the drafts job filled for a day, by part. */
export async function getOptions(date: string): Promise<{ part1: OptionSpec[]; part2: OptionSpec[] }> {
  const { data, error } = await createAdminClient().from("draft_options").select("part1, part2").eq("play_date", date).maybeSingle();
  if (error) throw error;
  return { part1: (data?.part1 ?? []) as OptionSpec[], part2: (data?.part2 ?? []) as OptionSpec[] };
}
