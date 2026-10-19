import "server-only";
import { normalizeName } from "@/lib/daily/match";
import { createAdminClient } from "@/lib/supabase/admin";
import { addDays, gameDate, matchweekBounds } from "@/lib/time";
import { draftDay, pairKey, pickPair, type Club, type PickData, type SharedPlayer } from "./generate";

/** Days ahead the job keeps drafted, so there is about a week to review. */
export const DRAFT_DAYS_AHEAD = 8;
/** Off a fixture, a club isn't picked again within this many days either side, when there's a choice. */
const CLUB_REST_DAYS = 3;
/** A club pair isn't reused within this many days. */
const PAIR_COOLDOWN_DAYS = 90;
/** Players from this many recent days are avoided in Part 2. */
const PLAYER_COOLDOWN_DAYS = 14;
const SOURCE = "Drafted from Wikidata. Check before scheduling.";

export type DraftResult = { drafted: { date: string; title: string; answers: number }[]; skipped: { date: string; reason: string }[] };

/** Fills every empty day from today to DRAFT_DAYS_AHEAD with a draft. */
export async function draftEmptyDays(today = gameDate()): Promise<DraftResult> {
  const admin = createAdminClient();
  const last = addDays(today, DRAFT_DAYS_AHEAD);
  const result: DraftResult = { drafted: [], skipped: [] };

  const { data: existing, error } = await admin
    .from("dailies")
    .select("play_date, part, title")
    .gte("play_date", addDays(today, -PAIR_COOLDOWN_DAYS))
    .lte("play_date", last);
  if (error) throw error;
  const filled = new Set((existing ?? []).filter((d) => d.part === 1).map((d) => d.play_date as string));
  const empty = Array.from({ length: DRAFT_DAYS_AHEAD + 1 }, (_, i) => addDays(today, i)).filter((d) => !filled.has(d));
  if (!empty.length) return result;

  const [{ data: clubRows }, { data: candidates, error: pairError }] = await Promise.all([
    admin.from("clubs").select("id, name"),
    admin.rpc("club_pair_overlaps"),
  ]);
  if (pairError) throw pairError;
  const pairs = ((candidates ?? []) as { club_a: number; club_b: number; players: number }[]).map((c) => ({
    a: c.club_a,
    b: c.club_b,
    players: c.players,
  }));
  const clubs = new Map<number, Club>((clubRows ?? []).map((c) => [c.id, c]));
  const clubByName = new Map([...clubs.values()].map((c) => [c.name, c.id]));

  // Pairs already used recently or still to come, read from the titles ("A v B").
  const used = new Set<string>();
  const clubsOn = new Map<string, number[]>();
  for (const d of existing ?? []) {
    const [a, b] = String(d.title).split(" v ").map((n) => clubByName.get(n));
    if (a && b) {
      used.add(pairKey(a, b));
      clubsOn.set(d.play_date as string, [a, b]);
    }
  }
  const restedNear = (date: string) =>
    new Set(Array.from({ length: 2 * CLUB_REST_DAYS + 1 }, (_, i) => clubsOn.get(addDays(date, i - CLUB_REST_DAYS)) ?? []).flat());
  const recent = await recentAnswerNames(addDays(today, -PLAYER_COOLDOWN_DAYS), last);
  const fixtures = await fixturePairs(matchweekBounds(today).startsOn, addDays(last, 7));

  for (const date of empty) {
    const week = matchweekBounds(date);
    const sameWeek = [...fixtures].filter(([d]) => d >= week.startsOn && d <= week.endsOn);
    const preferred = [...sameWeek.filter(([d]) => d === date), ...sameWeek.filter(([d]) => d !== date)].map(([, pair]) => pair);
    const pair = pickPair(date, pairs, preferred, used, restedNear(date));
    if (!pair) {
      result.skipped.push({ date, reason: "No unused club pair with a good list. Import more clubs or wait for the cooldown." });
      continue;
    }
    const [home, away] = pair.map((id) => clubs.get(id)!);
    const [players, picks] = await Promise.all([sharedPlayers(home.id, away.id), pickData(home.id, away.id, date)]);
    const day = draftDay(date, home, away, players, recent, picks);

    const { error: saveError } = await admin.rpc("maker_save_day", {
      p_play_date: date,
      p_status: "draft",
      p_checked_by: null,
      p_parts: [day.part1, day.part2].map(
        (p) => p && { format: p.format, title: p.title, prompt: p.prompt, time_limit_seconds: p.time, source_note: SOURCE, answers: p.answers },
      ),
    });
    if (saveError) {
      result.skipped.push({ date, reason: saveError.message });
      continue;
    }
    used.add(pairKey(home.id, away.id));
    clubsOn.set(date, [home.id, away.id]);
    for (const a of [...day.part1.answers, ...(day.part2?.answers ?? [])]) recent.add(normalizeName(playerIn(a)));
    result.drafted.push({ date, title: day.part1.title, answers: day.part1.answers.length });
  }
  return result;
}

/** Publishes every draft part for today and tomorrow, so no day goes out empty. */
export async function publishDueDrafts(today = gameDate()): Promise<string[]> {
  const { data, error } = await createAdminClient()
    .from("dailies")
    .update({ status: "scheduled" })
    .eq("status", "draft")
    .gte("play_date", today)
    .lte("play_date", addDays(today, 1))
    .select("play_date, part");
  if (error) throw error;
  return (data ?? []).map((d) => `${d.play_date} part ${d.part}`);
}

async function sharedPlayers(a: number, b: number): Promise<SharedPlayer[]> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("club_pair_players", { p_a: a, p_b: b });
  if (error) throw error;
  const rows = (data ?? []) as { player_id: number; known_as: string; joined_a: string | null; joined_b: string | null }[];
  const { data: aliasRows } = rows.length
    ? await admin.from("player_aliases").select("player_id, alias").in("player_id", rows.map((r) => r.player_id))
    : { data: [] };
  const aliases = new Map<number, string[]>();
  for (const r of aliasRows ?? []) aliases.set(r.player_id, [...(aliases.get(r.player_id) ?? []), r.alias]);
  return rows.map((r) => ({ id: r.player_id, name: r.known_as, aliases: aliases.get(r.player_id) ?? [], joinedA: r.joined_a, joinedB: r.joined_b }));
}

/** The player an answer is about: the answer, or for Era picks the name in the question. */
function playerIn(a: { answer_text: string; question?: string | null }): string {
  return a.question ? a.question.split(" at ")[0] : a.answer_text;
}

async function recentAnswerNames(from: string, to: string): Promise<Set<string>> {
  const { data } = await createAdminClient()
    .from("daily_answers")
    .select("answer_text, question, dailies!inner(play_date)")
    .gte("dailies.play_date", from)
    .lte("dailies.play_date", to);
  return new Set((data ?? []).map((r) => normalizeName(playerIn(r))));
}

/** Wrong options for Rapid picks, and both clubs' dated spells for Era picks. */
async function pickData(a: number, b: number, date: string): Promise<PickData> {
  const admin = createAdminClient();
  const [decoys, spellsA, spellsB] = await Promise.all([
    admin.rpc("club_pair_decoys", { p_a: a, p_b: b }),
    admin.rpc("club_dated_spells", { p_club: a }),
    admin.rpc("club_dated_spells", { p_club: b }),
  ]);
  for (const r of [decoys, spellsA, spellsB]) if (r.error) throw r.error;
  type SpellRow = { player_id: number; known_as: string; joined_on: string; left_on: string };
  const spells = (rows: SpellRow[]) => rows.map((r) => ({ id: r.player_id, name: r.known_as, joined: r.joined_on, left: r.left_on }));
  return {
    decoys: ((decoys.data ?? []) as { player_id: number; known_as: string; club_id: number }[]).map((d) => ({ id: d.player_id, name: d.known_as, club: d.club_id })),
    spells: new Map([
      [a, spells((spellsA.data ?? []) as SpellRow[])],
      [b, spells((spellsB.data ?? []) as SpellRow[])],
    ]),
    // A spell that ends after the day it's asked about would give the game away.
    nowYear: Number(date.slice(0, 4)),
  };
}

/** Fixtures by game date (Lagos time), as [date, [home club, away club]]. */
async function fixturePairs(from: string, to: string): Promise<[string, [number, number]][]> {
  const { data } = await createAdminClient()
    .from("fixtures")
    .select("kickoff_at, home_club_id, away_club_id")
    .gte("kickoff_at", `${from}T00:00:00Z`)
    .lte("kickoff_at", `${to}T23:59:59Z`)
    .order("kickoff_at");
  return (data ?? []).map((f) => [gameDate(new Date(f.kickoff_at)), [f.home_club_id, f.away_club_id]]);
}
