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
  await saveSample(date, "picks");
  return true;
}

/** The sample's two pairings: the tapped rounds, or the typed ones. */
export type SampleKind = "picks" | "typed";

const PARTS: Record<SampleKind, object[]> = {
  picks: [
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
  typed: [
    {
      format: "free_recall",
      title: "Chelsea v Arsenal",
      prompt: `Name the ${BOTH.length} players who've played for both Chelsea and Arsenal since 1992.`,
      time_limit_seconds: 180,
      source_note: SOURCE,
      answers: BOTH.map((answer_text, i) => ({ answer_text, extra_aliases: [], position: i + 1, reveal_note: null, question: null, choices: [] })),
    },
    {
      format: "in_order",
      title: "In order",
      prompt: "They all played for Arsenal. Earliest to join at the top.",
      time_limit_seconds: 60,
      source_note: SOURCE,
      // ERAS is already in the order they joined.
      answers: ERAS.map(([name, from], i) => ({ answer_text: name, extra_aliases: [], position: i + 1, reveal_note: `Joined ${from}`, question: null, choices: [] })),
    },
  ],
};

async function saveSample(date: string, kind: SampleKind): Promise<void> {
  const { error } = await createAdminClient().rpc("maker_save_day", {
    p_play_date: date,
    p_status: "scheduled",
    p_checked_by: null,
    p_parts: PARTS[kind],
  });
  if (error) throw error;
}

/**
 * On a test site, swaps today's Daily for the sample with the tapped or the
 * typed rounds, so every round type can be tried on any day. A part can't be
 * changed once played, so this wipes everyone's tries at today's Daily first:
 * fine on the shared dev database, never run on production.
 */
export async function switchTestDaily(kind: SampleKind, date = gameDate()): Promise<void> {
  if (!isTestSite()) return;
  const admin = createAdminClient();
  const { data, error } = await admin.from("dailies").select("id").eq("play_date", date);
  if (error) throw error;
  const ids = (data ?? []).map((d) => d.id);
  if (ids.length) {
    const { error: wipeError } = await admin.from("attempts").delete().in("daily_id", ids);
    if (wipeError) throw wipeError;
  }
  await saveSample(date, kind);
}

/** On a test site, wipes your own tries at today's Daily so you can play it again. */
export async function clearTodaysAttempts(userId: string, date = gameDate()): Promise<void> {
  if (!isTestSite()) return;
  const admin = createAdminClient();
  const { data } = await admin.from("dailies").select("id").eq("play_date", date);
  const ids = (data ?? []).map((d) => d.id);
  if (ids.length) await admin.from("attempts").delete().eq("user_id", userId).in("daily_id", ids);
}
