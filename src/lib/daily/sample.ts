import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { eraDecoys } from "@/lib/drafts/generate";
import { shownChoices, type PickLine } from "@/lib/maker/parse";
import { gameDate } from "@/lib/time";

// Test sites (previews and local) always have a Daily to play: the draft job
// only runs on production, so a day with nothing scheduled gets this sample
// (Rapid picks and Era picks; switch a day to the typed rounds in the maker).
// Production never does: a missing Daily there is a real problem to see.

/** Previews and local runs; never production. */
export function isTestSite(): boolean {
  return process.env.VERCEL_ENV !== "production";
}

const SOURCE = "Sample for testing (test sites only)";

// Rapid picks: played for both in the Premier League era, and players who
// played for just one of them.
const BOTH = ["Ashley Cole", "William Gallas", "Cesc Fàbregas", "Olivier Giroud", "Petr Čech", "David Luiz", "Willian", "Jorginho", "Kai Havertz", "Raheem Sterling"];
const ONE = [
  ["Frank Lampard", "Thierry Henry", "John Terry"],
  ["Patrick Vieira", "Didier Drogba", "Dennis Bergkamp"],
  ["Eden Hazard", "Robert Pires", "Gianfranco Zola"],
  ["Freddie Ljungberg", "Claude Makélélé", "Sol Campbell"],
  ["Michael Essien", "Tony Adams", "N'Golo Kanté"],
  ["Ian Wright", "Diego Costa", "Robin van Persie"],
  ["Juan Mata", "Mesut Özil", "Gary Cahill"],
  ["Alexis Sánchez", "Branislav Ivanović", "Bukayo Saka"],
  ["Arjen Robben", "Martin Ødegaard", "Ricardo Carvalho"],
  ["Aaron Ramsey", "César Azpilicueta", "Laurent Koscielny"],
];

// Era picks: Arsenal spells.
const ERAS: [string, number, number][] = [
  ["Dennis Bergkamp", 1995, 2006],
  ["Patrick Vieira", 1996, 2005],
  ["Thierry Henry", 1999, 2007],
  ["Robin van Persie", 2004, 2012],
  ["Mesut Özil", 2013, 2021],
];

const picks = (lines: PickLine[]) =>
  lines.map((l, i) => ({ answer_text: l.answer, extra_aliases: [], position: i + 1, reveal_note: null, question: l.question, choices: shownChoices(l) }));

/**
 * On a test site, makes sure today has a scheduled Daily: drafts for today are
 * scheduled, and an empty day gets the sample. Returns whether it changed anything.
 */
export async function ensureTestDaily(date = gameDate()): Promise<boolean> {
  if (!isTestSite()) return false;
  const admin = createAdminClient();
  const { data, error } = await admin.from("dailies").select("id, status").eq("play_date", date);
  if (error) throw error;
  if (data?.some((d) => d.status === "scheduled")) return false;
  if (data?.length) {
    await admin.from("dailies").update({ status: "scheduled" }).eq("play_date", date);
    return true;
  }
  const { error: saveError } = await admin.rpc("maker_save_day", {
    p_play_date: date,
    p_status: "scheduled",
    p_checked_by: null,
    p_parts: [
      {
        format: "pick",
        title: "Chelsea v Arsenal",
        prompt: "Tap the player who's played for both Chelsea and Arsenal since 1992.",
        time_limit_seconds: 60,
        source_note: SOURCE,
        answers: picks(BOTH.map((answer, i) => ({ question: null, answer, wrong: ONE[i] }))),
      },
      {
        format: "era",
        title: "Era picks",
        prompt: "When were they at Arsenal? Tap the right years.",
        time_limit_seconds: 45,
        source_note: SOURCE,
        answers: picks(ERAS.map(([name, from, to], i) => ({ question: `${name} at Arsenal`, answer: `${from}–${to}`, wrong: eraDecoys(from, to, i, 2026)! }))),
      },
    ],
  });
  if (saveError) throw saveError;
  return true;
}

/** On a test site, wipes your own tries at today's Daily so you can play it again. */
export async function clearTodaysAttempts(userId: string, date = gameDate()): Promise<void> {
  if (!isTestSite()) return;
  const admin = createAdminClient();
  const { data } = await admin.from("dailies").select("id").eq("play_date", date);
  const ids = (data ?? []).map((d) => d.id);
  if (ids.length) await admin.from("attempts").delete().eq("user_id", userId).in("daily_id", ids);
}
