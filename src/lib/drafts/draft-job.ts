import "server-only";
import { getLists } from "@/lib/curated/data";
import { normalizeName } from "@/lib/daily/match";
import { createAdminClient } from "@/lib/supabase/admin";
import { addDays, gameDate, matchweekBounds, seasonOf } from "@/lib/time";
import { draftDay, LONG_REST_DAYS, type PickData, type TemplateData } from "./day";
import { pairKey, pickPair, type Club, type PairRules, type SharedPlayer } from "./generate";
import type { MatchData, MatchPlayer, PlayedMatch } from "./matchday";
import type { CareerSpell, ClubSpell, FamousPlayer, Ground, ManagerStay } from "./templates";

/** Days ahead the job keeps drafted, so there is about a week to review. */
export const DRAFT_DAYS_AHEAD = 8;
/** Off a fixture, a club isn't picked again within this many days either side, when there's a choice. */
const CLUB_REST_DAYS = 3;
/** A club pair isn't reused within this many days. */
const PAIR_COOLDOWN_DAYS = 90;
/** Players from this many recent days are avoided in Part 2. */
const PLAYER_COOLDOWN_DAYS = 14;
/** A template isn't used again within this many days either side. */
const TEMPLATE_COOLDOWN_DAYS = 6;
/** Rows a Supabase call returns at most; longer results are fetched in pages. */
const PAGE = 1000;
const SOURCE = "Drafted from Wikidata. Check before scheduling.";

export type DraftResult = { drafted: { date: string; title: string; answers: number }[]; skipped: { date: string; reason: string }[] };

/** Fills every empty day from today to DRAFT_DAYS_AHEAD with a draft. */
export async function draftEmptyDays(today = gameDate()): Promise<DraftResult> {
  const admin = createAdminClient();
  const last = addDays(today, DRAFT_DAYS_AHEAD);
  const result: DraftResult = { drafted: [], skipped: [] };

  const { data: existing, error } = await admin
    .from("dailies")
    .select("play_date, part, title, template")
    .gte("play_date", addDays(today, -PAIR_COOLDOWN_DAYS))
    .lte("play_date", last);
  if (error) throw error;
  const filled = new Set((existing ?? []).filter((d) => d.part === 1).map((d) => d.play_date as string));
  const empty = Array.from({ length: DRAFT_DAYS_AHEAD + 1 }, (_, i) => addDays(today, i)).filter((d) => !filled.has(d));
  if (!empty.length) return result;

  const [{ data: clubRows }, { data: candidates, error: pairError }, managers, famous, lists] = await Promise.all([
    admin.from("clubs").select("id, name, top, in_premier_league, ground, ground_capacity"),
    admin.rpc("club_pair_overlaps"),
    allManagers(),
    famousPlayers(),
    getLists(),
  ]);
  const season = await seasonData(today);
  const grounds: Ground[] = (clubRows ?? []).flatMap((c) => (c.ground && c.ground_capacity ? [{ club: c.id, name: c.ground, capacity: c.ground_capacity }] : []));
  if (pairError) throw pairError;
  const pairs = ((candidates ?? []) as { club_a: number; club_b: number; players: number }[]).map((c) => ({
    a: c.club_a,
    b: c.club_b,
    players: c.players,
  }));
  const clubs = new Map<number, Club>((clubRows ?? []).map((c) => [c.id, { id: c.id, name: c.name }]));
  // Popular games only (Collins, 29 Oct 2026): the big six, and Europe's giants on UCL nights.
  const rules: PairRules = {
    bigSix: new Set((clubRows ?? []).filter((c) => c.top && c.in_premier_league).map((c) => c.id)),
    europe: new Set((clubRows ?? []).filter((c) => c.top && !c.in_premier_league).map((c) => c.id)),
  };
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
  // Templates by date, to keep one from running twice within a week.
  const templatesOn = new Map<string, string[]>();
  for (const d of existing ?? []) if (d.template) templatesOn.set(d.play_date as string, [...(templatesOn.get(d.play_date as string) ?? []), d.template]);
  const templatesNear = (date: string) =>
    new Set(Array.from({ length: 2 * TEMPLATE_COOLDOWN_DAYS + 1 }, (_, i) => templatesOn.get(addDays(date, i - TEMPLATE_COOLDOWN_DAYS)) ?? []).flat());
  const templatesBefore = (date: string, days: number) =>
    new Set(Array.from({ length: days }, (_, i) => templatesOn.get(addDays(date, -(i + 1))) ?? []).flat());
  const restedNear = (date: string) =>
    new Set(Array.from({ length: 2 * CLUB_REST_DAYS + 1 }, (_, i) => clubsOn.get(addDays(date, i - CLUB_REST_DAYS)) ?? []).flat());
  const recent = await recentAnswerNames(addDays(today, -PLAYER_COOLDOWN_DAYS), last);
  const fixtures = await fixturePairs(matchweekBounds(today).startsOn, addDays(last, 7));

  for (const date of empty) {
    const week = matchweekBounds(date);
    const sameWeek = fixtures.filter(([d, , c]) => c === "PL" && d >= week.startsOn && d <= week.endsOn);
    const preferred = [...sameWeek.filter(([d]) => d === date), ...sameWeek.filter(([d]) => d !== date)].map(([, pair]) => pair);
    // Cup nights (Collins, 29 Oct 2026): an FA Cup or League Cup tie with one of
    // the big six counts like a Champions League tie.
    const cup = fixtures.filter(([d, [h, a], c]) => (c === "FAC" || c === "EFL") && d === date && (rules.bigSix.has(h) || rules.bigSix.has(a)));
    const ucl = [...fixtures.filter(([d, , c]) => c === "UCL" && d === date), ...cup].map(([, pair]) => pair);
    const pair = pickPair(date, pairs, preferred, used, restedNear(date), rules, ucl);
    if (!pair) {
      result.skipped.push({ date, reason: "No club pair with one of the big six and a good list. Import more clubs." });
      continue;
    }
    const [home, away] = pair.map((id) => clubs.get(id)!);
    const [players, picks, spellsAt] = await Promise.all([
      sharedPlayers(home.id, away.id),
      pickData(home.id, away.id, date),
      Promise.all([clubSpells(home.id), clubSpells(away.id)]),
    ]);
    const more: TemplateData = {
      clubs,
      spellsAt: new Map([
        [home.id, spellsAt[0]],
        [away.id, spellsAt[1]],
      ]),
      careers: await careersOf([...players.map((p) => p.id), ...spellsAt.flatMap(bestKnownIds)]),
      recentTemplates: templatesNear(date),
      managers,
      famous,
      grounds,
      lists,
      restedTemplates: templatesBefore(date, LONG_REST_DAYS),
      matchday: await withMeetings(season, home.id, away.id, spellsAt, clubs),
    };
    const day = draftDay(date, home, away, players, recent, picks, more);

    const { error: saveError } = await admin.rpc("maker_save_day", {
      p_play_date: date,
      p_status: "draft",
      p_checked_by: null,
      p_parts: [day.part1, day.part2].map(
        (p) => p && { format: p.format, template: p.template, title: p.title, prompt: p.prompt, time_limit_seconds: p.time, source_note: p.source ?? SOURCE, answers: p.answers },
      ),
    });
    if (saveError) {
      result.skipped.push({ date, reason: saveError.message });
      continue;
    }
    used.add(pairKey(home.id, away.id));
    clubsOn.set(date, [home.id, away.id]);
    templatesOn.set(date, [day.part1.template, ...(day.part2 ? [day.part2.template] : [])]);
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
  const rows = (data ?? []) as { player_id: number; known_as: string; joined_a: string | null; joined_b: string | null; sitelinks: number | null }[];
  const { data: aliasRows } = rows.length
    ? await admin.from("player_aliases").select("player_id, alias").in("player_id", rows.map((r) => r.player_id))
    : { data: [] };
  const aliases = new Map<number, string[]>();
  for (const r of aliasRows ?? []) aliases.set(r.player_id, [...(aliases.get(r.player_id) ?? []), r.alias]);
  return rows.map((r) => ({ id: r.player_id, name: r.known_as, aliases: aliases.get(r.player_id) ?? [], joinedA: r.joined_a, joinedB: r.joined_b, fame: r.sitelinks ?? 0 }));
}

/** The player an answer is about: for Era picks the name in the question ("Henry at Arsenal"), else the answer. */
function playerIn(a: { answer_text: string; question?: string | null }): string {
  return a.question?.includes(" at ") ? a.question.split(" at ")[0] : a.answer_text;
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
  type SpellRow = { player_id: number; known_as: string; joined_on: string; left_on: string; sitelinks: number | null };
  const spells = (rows: SpellRow[]) => rows.map((r) => ({ id: r.player_id, name: r.known_as, joined: r.joined_on, left: r.left_on, fame: r.sitelinks ?? 0 }));
  return {
    decoys: ((decoys.data ?? []) as { player_id: number; known_as: string; club_id: number; sitelinks: number | null }[]).map((d) => ({
      id: d.player_id,
      name: d.known_as,
      club: d.club_id,
      fame: d.sitelinks ?? 0,
    })),
    spells: new Map([
      [a, spells((spellsA.data ?? []) as SpellRow[])],
      [b, spells((spellsB.data ?? []) as SpellRow[])],
    ]),
    // A spell that ends after the day it's asked about would give the game away.
    nowYear: Number(date.slice(0, 4)),
  };
}

/** Every Premier League era spell at a club, page by page. */
async function clubSpells(club: number): Promise<ClubSpell[]> {
  const admin = createAdminClient();
  type Row = {
    player_id: number;
    known_as: string;
    sitelinks: number | null;
    date_of_birth: string | null;
    joined_on: string | null;
    left_on: string | null;
    on_loan: boolean;
    aliases: string[] | null;
    nationality: string | null;
    height_cm: number | null;
    career_clubs: number | null;
  };
  const rows: Row[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await admin.rpc("club_spells", { p_club: club }).range(from, from + PAGE - 1);
    if (error) throw error;
    rows.push(...((data ?? []) as Row[]));
    if ((data ?? []).length < PAGE) break;
  }
  return rows.map((r) => ({
    id: r.player_id,
    name: r.known_as,
    aliases: r.aliases ?? [],
    fame: r.sitelinks ?? 0,
    dob: r.date_of_birth,
    joined: r.joined_on,
    left: r.left_on,
    loan: r.on_loan,
    nationality: r.nationality,
    heightCm: r.height_cm,
    careerClubs: r.career_clubs,
  }));
}

/** Every club's head coaches in the Premier League era. */
async function allManagers(): Promise<ManagerStay[]> {
  const { data, error } = await createAdminClient().from("club_managers").select("club_id, wikidata_qid, name, started_on, ended_on").limit(PAGE);
  if (error) throw error;
  return (data ?? []).map((m) => ({ club: m.club_id, qid: m.wikidata_qid, name: m.name, started: m.started_on, ended: m.ended_on }));
}

/** The best known thousand players with a nationality, for wrong options. */
async function famousPlayers(): Promise<FamousPlayer[]> {
  const { data, error } = await createAdminClient()
    .from("players")
    .select("id, known_as, sitelinks, nationality")
    .not("nationality", "is", null)
    .not("sitelinks", "is", null)
    .order("sitelinks", { ascending: false })
    .limit(PAGE);
  if (error) throw error;
  return (data ?? []).map((p) => ({ id: p.id, name: p.known_as, fame: p.sitelinks ?? 0, nationality: p.nationality }));
}

/** The best known players at a club, whose careers the moves need. */
function bestKnownIds(spells: ClubSpell[]): number[] {
  return [...new Map(spells.map((s) => [s.id, s])).values()]
    .sort((a, b) => b.fame - a.fame)
    .slice(0, 60)
    .map((s) => s.id);
}

/** Careers at every club we track, for some players. */
async function careersOf(ids: number[]): Promise<Map<number, CareerSpell[]>> {
  const admin = createAdminClient();
  const unique = [...new Set(ids)];
  const out = new Map<number, CareerSpell[]>();
  // About five tracked clubs a player at most, so 150 players stay well inside a page.
  for (let i = 0; i < unique.length; i += 150) {
    const { data, error } = await admin.rpc("player_careers", { p_ids: unique.slice(i, i + 150) });
    if (error) throw error;
    for (const r of (data ?? []) as { player_id: number; club_id: number; joined_on: string | null; left_on: string | null; on_loan: boolean }[])
      out.set(r.player_id, [...(out.get(r.player_id) ?? []), { club: r.club_id, joined: r.joined_on, left: r.left_on, loan: r.on_loan }]);
  }
  return out;
}

/** Fixtures by game date (Lagos time), as [date, [home club, away club], competition]. */
async function fixturePairs(from: string, to: string): Promise<[string, [number, number], string][]> {
  const { data } = await createAdminClient()
    .from("fixtures")
    .select("kickoff_at, home_club_id, away_club_id, competition")
    .gte("kickoff_at", `${from}T00:00:00Z`)
    .lte("kickoff_at", `${to}T23:59:59Z`)
    .order("kickoff_at");
  return (data ?? []).map((f) => [gameDate(new Date(f.kickoff_at)), [f.home_club_id, f.away_club_id], f.competition]);
}

type SeasonData = { asOf: string; table: MatchData["table"]; matches: PlayedMatch[]; seasonComplete: boolean; players: Map<number, MatchPlayer> };

/** Pages through a query that may return more than one page. */
async function allRows<T>(page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await page(from, from + PAGE - 1);
    if (error) throw error;
    rows.push(...(data ?? []));
    if ((data ?? []).length < PAGE) return rows;
  }
}

type EventRow = { fixture_id: number; type: string; club_id: number | null; player_id: number | null };
const goalOf = (e: EventRow) => ({ player: e.player_id, club: e.club_id ?? 0, ownGoal: e.type === "own-goal" });
const GOAL_TYPES = ["goal", "penalty", "own-goal"];

/** This season's Premier League so far (build D): the table, every detailed match, the players in them. */
async function seasonData(today: string): Promise<SeasonData> {
  const admin = createAdminClient();
  const season = seasonOf(today);
  const [table, waiting, fixtures, lines, events] = await Promise.all([
    admin.from("league_table").select("club_id, position, points, played").eq("season", season),
    // Finished matches the nightly job hasn't reached yet (it skips any without a Highlightly id too).
    admin
      .from("fixtures")
      .select("id", { head: true, count: "exact" })
      .eq("competition", "PL")
      .eq("season", season)
      .eq("status", "finished")
      .is("details_synced_at", null)
      .not("highlightly_match_id", "is", null),
    allRows((from, to) =>
      admin
        .from("fixtures")
        .select("id, kickoff_at, home_club_id, away_club_id, home_score, away_score")
        .eq("competition", "PL")
        .eq("season", season)
        .eq("status", "finished")
        .not("details_synced_at", "is", null)
        .order("kickoff_at", { ascending: false })
        .range(from, to),
    ),
    allRows((from, to) =>
      admin
        .from("player_match_stats")
        .select("fixture_id, player_id, club_id, started, minutes, match_rating, key_passes, goals, position, fixtures!inner(season, competition)")
        .eq("fixtures.season", season)
        .eq("fixtures.competition", "PL")
        .order("fixture_id")
        .order("player_id")
        .range(from, to),
    ),
    allRows((from, to) =>
      admin
        .from("match_events")
        .select("fixture_id, type, club_id, player_id, fixtures!inner(season, competition)")
        .in("type", GOAL_TYPES)
        .eq("fixtures.season", season)
        .eq("fixtures.competition", "PL")
        .order("fixture_id")
        .order("seq")
        .range(from, to),
    ),
  ]);
  if (table.error) throw table.error;
  if (waiting.error) throw waiting.error;
  const linesOf = new Map<number, PlayedMatch["lines"]>();
  for (const l of lines)
    linesOf.set(l.fixture_id, [
      ...(linesOf.get(l.fixture_id) ?? []),
      {
        player: l.player_id,
        club: l.club_id ?? 0,
        started: l.started ?? false,
        minutes: l.minutes ?? 0,
        rating: l.match_rating === null ? null : Number(l.match_rating),
        keyPasses: l.key_passes ?? 0,
        goals: l.goals ?? 0,
        position: l.position,
      },
    ]);
  const goalsOf = new Map<number, PlayedMatch["goals"]>();
  for (const e of events as EventRow[]) goalsOf.set(e.fixture_id, [...(goalsOf.get(e.fixture_id) ?? []), goalOf(e)]);
  const matches = fixtures.map((f) => ({
    date: gameDate(new Date(f.kickoff_at)),
    home: f.home_club_id,
    away: f.away_club_id,
    homeGoals: f.home_score ?? 0,
    awayGoals: f.away_score ?? 0,
    goals: goalsOf.get(f.id) ?? [],
    lines: linesOf.get(f.id) ?? [],
  }));
  const players = await playersById([...new Set([...lines.map((l) => l.player_id), ...(events as EventRow[]).flatMap((e) => (e.player_id ? [e.player_id] : []))])]);
  return { asOf: today, table: (table.data ?? []).map((t) => ({ club: t.club_id, position: t.position, points: t.points, played: t.played })), matches, seasonComplete: matches.length > 0 && waiting.count === 0, players };
}

/** Names, fame and nationality of some players. */
async function playersById(ids: number[]): Promise<Map<number, MatchPlayer>> {
  const admin = createAdminClient();
  const out = new Map<number, MatchPlayer>();
  for (let i = 0; i < ids.length; i += 300) {
    const { data, error } = await admin.from("players").select("id, known_as, sitelinks, nationality").in("id", ids.slice(i, i + 300));
    if (error) throw error;
    for (const p of data ?? []) out.set(p.id, { name: p.known_as, fame: p.sitelinks ?? 0, nationality: p.nationality });
  }
  return out;
}

/** The season's data plus the day's pair's last meetings with their goals. */
async function withMeetings(season: SeasonData, a: number, b: number, spells: ClubSpell[][], clubs: Map<number, Club>): Promise<MatchData> {
  const admin = createAdminClient();
  const { data: meetings, error } = await admin
    .from("fixtures")
    .select("id, kickoff_at, home_club_id, away_club_id, home_score, away_score")
    .or(`and(home_club_id.eq.${a},away_club_id.eq.${b}),and(home_club_id.eq.${b},away_club_id.eq.${a})`)
    .eq("status", "finished")
    .not("details_synced_at", "is", null)
    .order("kickoff_at", { ascending: false })
    .limit(10);
  if (error) throw error;
  const ids = (meetings ?? []).map((m) => m.id);
  const { data: events, error: eventError } = ids.length
    ? await admin.from("match_events").select("fixture_id, type, club_id, player_id").in("fixture_id", ids).in("type", GOAL_TYPES).order("seq")
    : { data: [], error: null };
  if (eventError) throw eventError;
  const players = new Map(season.players);
  const missing = (events ?? []).flatMap((e) => (e.player_id && !players.has(e.player_id) ? [e.player_id] : []));
  for (const [id, p] of await playersById([...new Set(missing)])) players.set(id, p);
  // Wrong options in old meetings come from the clubs' spells; they need to be named players too.
  for (const s of spells.flat()) if (!players.has(s.id)) players.set(s.id, { name: s.name, fame: s.fame, nationality: s.nationality ?? null });
  return {
    ...season,
    players,
    meetings: (meetings ?? []).map((m) => ({
      date: gameDate(new Date(m.kickoff_at)),
      home: m.home_club_id,
      away: m.away_club_id,
      homeGoals: m.home_score ?? 0,
      awayGoals: m.away_score ?? 0,
      goals: (events ?? []).filter((e) => e.fixture_id === m.id).map((e) => goalOf(e as EventRow)),
      lines: [],
    })),
    clubName: new Map([...clubs.values()].map((c) => [c.id, c.name])),
    spellsAt: new Map([
      [a, spells[0]],
      [b, spells[1]],
    ]),
  };
}
