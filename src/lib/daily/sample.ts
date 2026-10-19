import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { gameDate } from "@/lib/time";

// Test sites (previews and local) always have a Daily to play: the draft job
// only runs on production, so a day with nothing scheduled gets this sample.
// Production never does: a missing Daily there is a real problem to see.

/** Previews and local runs; never production. */
export function isTestSite(): boolean {
  return process.env.VERCEL_ENV !== "production";
}

const SOURCE = "Sample for testing (test sites only)";

const RECALL: [string, string[]][] = [
  ["Ashley Cole", []],
  ["William Gallas", []],
  ["Cesc Fàbregas", ["Cesc"]],
  ["Olivier Giroud", []],
  ["Petr Čech", ["Chech"]],
  ["David Luiz", ["Luiz"]],
  ["Willian", []],
  ["Jorginho", []],
  ["Pierre-Emerick Aubameyang", ["Auba"]],
  ["Kai Havertz", []],
  ["Raheem Sterling", []],
  ["Lassana Diarra", ["Lass"]],
  ["Emmanuel Petit", ["Manu Petit"]],
  ["Nicolas Anelka", []],
  ["Yossi Benayoun", []],
  ["Kepa Arrizabalaga", ["Kepa"]],
  ["Noni Madueke", ["Noni"]],
];

const ORDER: [string, string][] = [
  ["Emmanuel Petit", "2001"],
  ["Ashley Cole", "2006"],
  ["Nicolas Anelka", "2008"],
  ["Cesc Fàbregas", "2014"],
  ["Jorginho", "2018"],
  ["Kai Havertz", "2020"],
];

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
        title: "Chelsea v Arsenal",
        prompt: `Name the ${RECALL.length} players who've played for both clubs in the Premier League.`,
        time_limit_seconds: 120,
        source_note: SOURCE,
        answers: RECALL.map(([answer_text, extra_aliases]) => ({ answer_text, extra_aliases, position: null, reveal_note: null })),
      },
      {
        title: "In order",
        prompt: "When did they first sign for Chelsea? Earliest at the top.",
        time_limit_seconds: 60,
        source_note: SOURCE,
        answers: ORDER.map(([answer_text, reveal_note], i) => ({ answer_text, extra_aliases: [], position: i + 1, reveal_note })),
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
