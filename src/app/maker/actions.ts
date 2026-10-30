"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getDay, isAdmin, requireAdmin } from "@/lib/maker/data";
import { orderIssues, parseOrder, parsePicks, parseRecall, pickIssues, recallIssues, shownChoices } from "@/lib/maker/parse";
import { clubsIn, LIST_KINDS, parseList } from "@/lib/curated/lists";

export type SignInState = { error: string; email: string } | null;

export async function signIn(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Enter your email and password.", email };
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) return { error: "That email and password don't match.", email };
  if (!(await isAdmin(data.user.id))) {
    await supabase.auth.signOut();
    return { error: "This account can't use the maker.", email };
  }
  redirect("/maker");
}

export async function signOut() {
  await (await createClient()).auth.signOut();
  redirect("/maker/login");
}

export type SaveState = { ok: true; savedAt: string } | { ok: false; errors: string[] } | null;

const text = (max: number) => z.string().trim().min(1).max(max);
const partFields = z.object({
  title: text(80),
  prompt: text(280),
  time: z.coerce.number().int().min(10).max(600),
  source: z.string().trim().max(200),
  answers: z.string(),
});

function field(formData: FormData, part: number, name: string) {
  return String(formData.get(`p${part}_${name}`) ?? "");
}

/** Saves both parts of one day. A part anyone has played is left untouched. */
export async function saveDay(_prev: SaveState, formData: FormData): Promise<SaveState> {
  const adminId = await requireAdmin();
  const date = z.iso.date().safeParse(formData.get("date"));
  const status = z.enum(["draft", "scheduled"]).safeParse(formData.get("status"));
  if (!date.success || !status.success) return { ok: false, errors: ["Pick a date and a status."] };

  const existing = await getDay(date.data);
  const played = (part: number) => (existing.parts.find((p) => p.part === part)?.plays ?? 0) > 0;
  const errors: string[] = [];
  const specs: unknown[] = [];

  for (const part of [1, 2]) {
    if (played(part)) {
      specs.push({ keep: true });
      continue;
    }
    const raw = Object.fromEntries(["title", "prompt", "time", "source", "answers"].map((n) => [n, field(formData, part, n)]));
    const label = part === 1 ? "Part 1" : "Part 2";
    // Part 2 is optional: left blank, it is removed.
    if (part === 2 && !raw.title.trim() && !raw.prompt.trim() && !raw.answers.trim()) {
      specs.push(null);
      continue;
    }
    const parsed = partFields.safeParse(raw);
    if (!parsed.success) {
      errors.push(`${label}: fill in the title, the prompt and a time limit of 10 to 600 seconds.`);
      continue;
    }
    const { title, prompt, time, source } = parsed.data;
    const asked = field(formData, part, "format");
    const format = part === 1 ? (asked === "pick" ? "pick" : "free_recall") : asked === "era" ? "era" : "in_order";
    if (format === "pick" || format === "era") {
      const lines = parsePicks(parsed.data.answers);
      errors.push(...pickIssues(lines, format).errors.map((e) => `${label}: ${e}`));
      specs.push({
        format,
        title,
        prompt,
        time_limit_seconds: time,
        source_note: source,
        answers: lines.map((l, i) => ({ answer_text: l.answer, extra_aliases: [], position: i + 1, reveal_note: null, question: l.question, choices: shownChoices(l) })),
      });
    } else if (part === 1) {
      const answers = parseRecall(parsed.data.answers);
      errors.push(...recallIssues(answers).errors.map((e) => `${label}: ${e}`));
      specs.push({
        title,
        prompt,
        time_limit_seconds: time,
        source_note: source,
        answers: answers.map((a) => ({ answer_text: a.text, extra_aliases: a.aliases, position: null, reveal_note: null })),
      });
    } else {
      const answers = parseOrder(parsed.data.answers);
      errors.push(...orderIssues(answers).errors.map((e) => `${label}: ${e}`));
      specs.push({
        title,
        prompt,
        time_limit_seconds: time,
        source_note: source,
        answers: answers.map((a, i) => ({ answer_text: a.text, extra_aliases: [], position: i + 1, reveal_note: a.note })),
      });
    }
  }
  if (errors.length) return { ok: false, errors };

  const { error } = await createAdminClient().rpc("maker_save_day", {
    p_play_date: date.data,
    p_status: status.data,
    p_checked_by: adminId,
    p_parts: specs,
  });
  if (error) return { ok: false, errors: [error.message] };
  refresh();
  return { ok: true, savedAt: new Date().toISOString() };
}

export type ListState = { ok: true; rows: number; warnings: string[] } | { ok: false; errors: string[] } | null;

/** Saves one of build C's lists whole, from the Lists page's text. */
export async function saveList(_prev: ListState, formData: FormData): Promise<ListState> {
  await requireAdmin();
  const kind = z.enum(LIST_KINDS).safeParse(formData.get("kind"));
  if (!kind.success) return { ok: false, errors: ["Unknown list."] };
  const { rows, errors } = parseList(kind.data, String(formData.get("text") ?? ""));
  if (errors.length) return { ok: false, errors };
  if (!rows.length) return { ok: false, errors: ["The list is empty. Saving it would wipe it."] };

  // The drafts find the day's clubs by our names, so a club we don't know is
  // a typo where it must be ours (captains, moments) and a note elsewhere (QPR).
  const admin = createAdminClient();
  const { data: clubs, error: clubError } = await admin.from("clubs").select("name");
  if (clubError) return { ok: false, errors: [clubError.message] };
  const known = new Set((clubs ?? []).map((c) => c.name));
  const unknown = [...new Set(clubsIn(kind.data, rows).filter((c) => !known.has(c)))];
  if (unknown.length && (kind.data === "captains" || kind.data === "moments"))
    return { ok: false, errors: [`Not one of our clubs: ${unknown.join(", ")}. Use the name the app uses, like Man United or Spurs.`] };

  const { error } = await admin.rpc("maker_save_list", { p_list: kind.data, p_rows: rows });
  if (error) return { ok: false, errors: [error.message] };
  refresh();
  return { ok: true, rows: rows.length, warnings: unknown.length ? [`Not clubs we track, so they never come up as the day's clubs: ${unknown.join(", ")}.`] : [] };
}
