import "server-only";
import { boxScore, callsToday, DAILY_BUDGET, FA_CUP_LEAGUE_ID, headToHead, LEAGUE_CUP_LEAGUE_ID, matchDetails, standings, UCL_LEAGUE_ID } from "@/lib/fixtures/highlightly";
import { fixtureOf, type Competition } from "@/lib/fixtures/parse";
import { serverEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { addDays, gameDate } from "@/lib/time";
import { normalizeName } from "@/lib/daily/match";
import { boxRowsOf, eventsOf, matchPlayer, shirtName, tableOf, type BoxRow, type Candidate } from "./parse";

// Template build D (Collins, 30 Oct 2026): the nightly match data job. The
// Premier League table, each upcoming pair's last ten meetings, then every
// finished match's goals and cards (and, for this season's Premier League, its
// box score), newest first, as far as the day's calls allow.

/** The fixture sync runs every night too and needs about 17 calls, so this job stops short of the budget. */
export const MATCH_DATA_BUDGET = DAILY_BUDGET - 20;
/** Pairs drafted or playing within this many days get their history fetched. */
const PAIR_DAYS_AHEAD = 8;
/** A pair's last ten meetings are fetched again after this long (new meetings arrive through the fixture sync anyway). */
const PAIR_REFRESH_DAYS = 120;

export type MatchDataResult = {
  calls: number;
  table: number;
  pairs: string[];
  meetings: number;
  matches: number;
  boxScores: number;
  newPlayers: number;
  /** Finished matches still without their details, for the next nights. */
  left: number;
  note?: string;
};

export async function syncMatchData(today = gameDate()): Promise<MatchDataResult> {
  const admin = createAdminClient();
  const env = serverEnv();
  let used = await callsToday();
  const result: MatchDataResult = { calls: 0, table: 0, pairs: [], meetings: 0, matches: 0, boxScores: 0, newPlayers: 0, left: 0 };
  const spend = (n: number) => {
    if (used + n > MATCH_DATA_BUDGET) return false;
    used += n;
    result.calls += n;
    return true;
  };

  const { data: clubs, error: clubError } = await admin.from("clubs").select("id, name, highlightly_team_id");
  if (clubError) throw clubError;
  const clubOf = new Map((clubs ?? []).flatMap((c) => (c.highlightly_team_id ? [[c.highlightly_team_id, c.id] as const] : [])));
  const teamOf = new Map((clubs ?? []).flatMap((c) => (c.highlightly_team_id ? [[c.id, c.highlightly_team_id] as const] : [])));
  const clubByName = new Map((clubs ?? []).map((c) => [c.name, c.id]));

  // 1. The table.
  if (spend(1)) {
    const rows = tableOf(await standings()).filter((r) => clubOf.has(r.teamId));
    const now = new Date().toISOString();
    const { error } = await admin.from("league_table").upsert(
      rows.map((r) => ({
        season: env.HIGHLIGHTLY_SEASON,
        position: r.position,
        club_id: clubOf.get(r.teamId)!,
        played: r.played,
        won: r.won,
        drawn: r.drawn,
        lost: r.lost,
        goals_for: r.gf,
        goals_against: r.ga,
        points: r.points,
        updated_at: now,
      })),
      { onConflict: "season,club_id" },
    );
    if (error) throw error;
    result.table = rows.length;
  }

  // 2. Fixture history for the pairs coming up: the Dailies drafted and the Premier League's own fixtures.
  const last = addDays(today, PAIR_DAYS_AHEAD);
  const [{ data: dailies }, { data: upcoming }, { data: known }] = await Promise.all([
    admin.from("dailies").select("title").eq("part", 1).gte("play_date", today).lte("play_date", last),
    admin.from("fixtures").select("home_club_id, away_club_id").eq("competition", "PL").gte("kickoff_at", `${today}T00:00:00Z`).lte("kickoff_at", `${last}T23:59:59Z`),
    admin.from("pair_history").select("club_a, club_b").gte("synced_at", new Date(Date.now() - PAIR_REFRESH_DAYS * 86_400_000).toISOString()),
  ]);
  const key = (a: number, b: number) => (a < b ? [a, b] : [b, a]) as [number, number];
  const done = new Set((known ?? []).map((p) => `${p.club_a}-${p.club_b}`));
  const pairs = new Map<string, [number, number]>();
  for (const d of dailies ?? []) {
    const [a, b] = String(d.title).split(" v ").map((n) => clubByName.get(n));
    if (a && b) pairs.set(key(a, b).join("-"), key(a, b));
  }
  for (const f of upcoming ?? []) pairs.set(key(f.home_club_id, f.away_club_id).join("-"), key(f.home_club_id, f.away_club_id));
  const competitionOf = new Map<number, Competition>([
    [env.HIGHLIGHTLY_PL_LEAGUE_ID, "PL"],
    [UCL_LEAGUE_ID, "UCL"],
    [FA_CUP_LEAGUE_ID, "FAC"],
    [LEAGUE_CUP_LEAGUE_ID, "EFL"],
  ]);
  for (const [k, [a, b]] of pairs) {
    if (done.has(k) || !teamOf.has(a) || !teamOf.has(b)) continue;
    if (!spend(1)) break;
    const meetings = (await headToHead(teamOf.get(a)!, teamOf.get(b)!)).flatMap((m) => {
      const competition = competitionOf.get(m.league?.id);
      return competition ? [fixtureOf(m, competition)] : [];
    });
    if (meetings.length) {
      // Ignore rows the fixture sync already has, so their matchweek and status stay its own.
      const { error } = await admin.from("fixtures").upsert(
        meetings.map((r) => ({
          highlightly_match_id: r.highlightly_match_id,
          competition: r.competition,
          season: r.season,
          pl_round: r.pl_round,
          kickoff_at: r.kickoff_at,
          home_club_id: clubOf.get(r.home_team)!,
          away_club_id: clubOf.get(r.away_team)!,
          status: r.status,
          home_score: r.home_score,
          away_score: r.away_score,
        })),
        { onConflict: "highlightly_match_id", ignoreDuplicates: true },
      );
      if (error) throw error;
    }
    const { error } = await admin.from("pair_history").upsert({ club_a: a, club_b: b, synced_at: new Date().toISOString() });
    if (error) throw error;
    result.pairs.push(k);
    result.meetings += meetings.length;
  }

  // 3. Finished matches without their details, newest first.
  const { data: todo, error: todoError } = await admin
    .from("fixtures")
    .select("id, highlightly_match_id, competition, season, kickoff_at")
    .eq("status", "finished")
    .is("details_synced_at", null)
    .not("highlightly_match_id", "is", null)
    .order("kickoff_at", { ascending: false })
    .limit(200);
  if (todoError) throw todoError;
  const players = new PlayerFinder();
  for (const f of todo ?? []) {
    const withBox = f.competition === "PL" && f.season === env.HIGHLIGHTLY_SEASON;
    if (!spend(withBox ? 2 : 1)) break;
    const date = f.kickoff_at.slice(0, 10);

    if (withBox) {
      const rows = boxRowsOf(await boxScore(f.highlightly_match_id!)).filter((r) => clubOf.has(r.teamId));
      for (const r of rows) await players.find(r, clubOf.get(r.teamId)!, date);
      await players.create(rows);
      const stats = rows.flatMap((r) => {
        const id = players.idOf(r.hlId);
        return id ? [statRow(f.id, id, clubOf.get(r.teamId)!, r)] : [];
      });
      // A player listed twice (it happens) keeps one row.
      const unique = [...new Map(stats.map((s) => [s.player_id, s])).values()];
      const { error } = await admin.from("player_match_stats").upsert(unique, { onConflict: "fixture_id,player_id" });
      if (error) throw error;
      result.boxScores++;
    }

    const events = eventsOf((await matchDetails(f.highlightly_match_id!))?.events ?? []).filter((e) => clubOf.has(e.teamId));
    const rows = [];
    for (const e of events) {
      const club = clubOf.get(e.teamId)!;
      const player = await players.find({ hlId: e.playerHlId, name: e.playerName, fullName: e.playerName }, club, date);
      const assist = e.assistName ? await players.find({ hlId: e.assistHlId, name: e.assistName, fullName: e.assistName }, club, date) : null;
      rows.push({
        fixture_id: f.id,
        seq: e.seq,
        minute: e.minute,
        type: e.type,
        club_id: club,
        player_id: player,
        player_name: e.playerName,
        assist_player_id: assist,
        assist_name: e.assistName,
      });
    }
    const { error: clearError } = await admin.from("match_events").delete().eq("fixture_id", f.id);
    if (clearError) throw clearError;
    if (rows.length) {
      const { error } = await admin.from("match_events").insert(rows);
      if (error) throw error;
    }
    const { error } = await admin.from("fixtures").update({ details_synced_at: new Date().toISOString() }).eq("id", f.id);
    if (error) throw error;
    await players.flush();
    result.matches++;
  }
  result.newPlayers = players.created;
  result.left = Math.max(0, (todo?.length ?? 0) - result.matches);
  if (result.left) result.note = `Out of calls for today (${used} of ${MATCH_DATA_BUDGET}). The rest come on the next nights.`;
  return result;
}

const statRow = (fixture: number, player: number, club: number, r: BoxRow) => ({
  fixture_id: fixture,
  player_id: player,
  club_id: club,
  minutes: r.minutes,
  started: r.started,
  position: r.position,
  shirt_number: r.shirt,
  goals: r.goals,
  assists: r.assists,
  shots: r.shots,
  key_passes: r.keyPasses,
  dribbles_total: r.dribblesTotal,
  dribbles_successful: r.dribblesSuccessful,
  duels_total: r.duelsTotal,
  duels_won: r.duelsWon,
  tackles: r.tackles,
  interceptions: r.interceptions,
  xg: r.xg,
  xa: r.xa,
  match_rating: r.rating,
  yellow_cards: r.yellow,
  red_cards: r.red,
});

/**
 * Highlightly's players as ours: by the Highlightly id we saved before; else by
 * name among the players we know at that club around that date; else (Wikidata
 * misses some spells, like Lewis Dunk's at Brighton) by a name only one of our
 * players has. A box score's player nobody fits becomes a new player; an
 * event's stays a name. Everyone is loaded once a run, so a match costs a few
 * queries, not one a player.
 */
class PlayerFinder {
  created = 0;
  private admin = createAdminClient();
  private byHl = new Map<number, number>();
  private byName = new Map<string, number[]>();
  private loaded = false;
  private linked: { id: number; hlId: number }[] = [];
  private spells = new Map<number, { id: number; knownAs: string; aliases: string[]; joined: string | null; left: string | null }[]>();

  async find(hl: { hlId: number | null; name: string; fullName: string }, club: number, date: string): Promise<number | null> {
    await this.load();
    if (hl.hlId && this.byHl.has(hl.hlId)) return this.byHl.get(hl.hlId)!;
    const near = (await this.at(club)).filter(
      (s) => (!s.joined || s.joined <= addDays(date, 365)) && (!s.left || s.left >= addDays(date, -365)),
    );
    const candidates: Candidate[] = [...new Map(near.map((s) => [s.id, { id: s.id, knownAs: s.knownAs, fullName: s.knownAs, aliases: s.aliases }])).values()];
    const anywhere = [normalizeName(hl.name), normalizeName(hl.fullName), normalizeName(shirtName(hl))].map((n) => this.byName.get(n) ?? []);
    const found = matchPlayer(hl, candidates) ?? anywhere.find((ids) => new Set(ids).size === 1)?.[0] ?? null;
    if (found && hl.hlId) {
      this.byHl.set(hl.hlId, found);
      this.linked.push({ id: found, hlId: hl.hlId });
    }
    return found;
  }

  /** New players for a box score's rows nobody fits, in one insert. */
  async create(rows: BoxRow[]): Promise<void> {
    const fresh = [...new Map(rows.filter((r) => !this.byHl.has(r.hlId)).map((r) => [r.hlId, r])).values()];
    if (!fresh.length) return;
    const { data, error } = await this.admin
      .from("players")
      .insert(fresh.map((r) => ({ full_name: r.fullName, known_as: shirtName(r), highlightly_player_id: r.hlId, position: r.position })))
      .select("id, highlightly_player_id");
    if (error) throw error;
    for (const p of data ?? []) this.byHl.set(p.highlightly_player_id!, p.id);
    this.created += fresh.length;
  }

  idOf = (hlId: number) => this.byHl.get(hlId) ?? null;

  /** Saves the Highlightly ids matched this run, so the next run finds them at once. */
  async flush(): Promise<void> {
    const todo = this.linked.splice(0);
    for (let i = 0; i < todo.length; i += 25) {
      await Promise.all(
        todo.slice(i, i + 25).map(({ id, hlId }) =>
          // Taken by another player already: leave it.
          this.admin.from("players").update({ highlightly_player_id: hlId }).eq("id", id).is("highlightly_player_id", null),
        ),
      );
    }
  }

  private async load() {
    if (this.loaded) return;
    this.loaded = true;
    for (let from = 0; ; from += 1000) {
      const { data, error } = await this.admin.from("players").select("id, known_as, full_name, highlightly_player_id").order("id").range(from, from + 999);
      if (error) throw error;
      for (const p of data ?? []) {
        if (p.highlightly_player_id) this.byHl.set(p.highlightly_player_id, p.id);
        for (const n of new Set([normalizeName(p.known_as), normalizeName(p.full_name)])) if (n) this.byName.set(n, [...(this.byName.get(n) ?? []), p.id]);
      }
      if ((data ?? []).length < 1000) break;
    }
  }

  private async at(club: number) {
    if (!this.spells.has(club)) {
      const rows: { player_id: number; known_as: string; joined_on: string | null; left_on: string | null; aliases: string[] | null }[] = [];
      for (let from = 0; ; from += 1000) {
        const { data, error } = await this.admin.rpc("club_spells", { p_club: club }).range(from, from + 999);
        if (error) throw error;
        rows.push(...((data ?? []) as typeof rows));
        if ((data ?? []).length < 1000) break;
      }
      this.spells.set(
        club,
        rows.map((r) => ({ id: r.player_id, knownAs: r.known_as, aliases: r.aliases ?? [], joined: r.joined_on, left: r.left_on })),
      );
    }
    return this.spells.get(club)!;
  }
}
