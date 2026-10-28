import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { callsToday, DAILY_BUDGET, seasonMatches, UCL_LEAGUE_ID } from "./highlightly";
import { clubKey, fixtureOf, type Competition, type HighlightlyMatch } from "./parse";

export type SyncResult = {
  calls: number;
  fixtures: number;
  /** Champions League ties between clubs we track (UCL nights). */
  ucl: number;
  finished: number;
  /** Premier League teams we have no club for: those matches are skipped. */
  unknownTeams: string[];
};

/** Pulls the season's Premier League and Champions League fixtures and results into our tables. */
export async function syncFixtures(): Promise<SyncResult | { skipped: string }> {
  const used = await callsToday();
  // A full sync is about 7 calls: 380 Premier League matches and about 250 in
  // the Champions League (qualifiers included), 100 a page.
  if (used + 7 > DAILY_BUDGET) return { skipped: `Highlightly budget used: ${used} of ${DAILY_BUDGET} calls in the last 24 hours.` };

  const admin = createAdminClient();
  const pl = await seasonMatches();
  const ucl = await seasonMatches(UCL_LEAGUE_ID);
  const calls = Math.max(1, Math.ceil(pl.length / 100)) + Math.max(1, Math.ceil(ucl.length / 100));

  // Our clubs by Highlightly team id, learning ids from names the first time.
  const { data: clubs, error } = await admin.from("clubs").select("id, name, highlightly_team_id");
  if (error) throw error;
  const byTeam = new Map<number, number>();
  const byName = new Map<string, number>();
  for (const c of clubs ?? []) {
    if (c.highlightly_team_id) byTeam.set(c.highlightly_team_id, c.id);
    byName.set(c.name.toLowerCase(), c.id);
  }
  const unknown = new Map<number, string>();
  const learn = async (matches: HighlightlyMatch[], report: boolean) => {
    for (const team of matches.flatMap((m) => [m.homeTeam, m.awayTeam])) {
      if (byTeam.has(team.id)) continue;
      const id = byName.get(clubKey(team.name));
      if (!id) {
        // Most Champions League clubs aren't tracked, and that's fine: only ties between ours are kept.
        if (report) unknown.set(team.id, team.name);
        continue;
      }
      const { error: linkError } = await admin.from("clubs").update({ highlightly_team_id: team.id }).eq("id", id);
      if (linkError) throw linkError;
      byTeam.set(team.id, id);
    }
  };
  await learn(pl, true);
  await learn(ucl, false);

  const ours = (matches: HighlightlyMatch[], competition: Competition) =>
    matches.map((m) => fixtureOf(m, competition)).filter((f) => byTeam.has(f.home_team) && byTeam.has(f.away_team));
  const plRows = ours(pl, "PL");
  const uclRows = ours(ucl, "UCL");
  const rows = [...plRows, ...uclRows];

  // Matchweeks: one row per Monday the fixtures fall in.
  const weeks = [...new Map(rows.map((r) => [r.matchweek_starts_on, r.season])).entries()].map(([starts_on, season]) => ({ starts_on, season }));
  const { data: weekRows, error: weekError } = await admin
    .from("matchweeks")
    .upsert(weeks, { onConflict: "starts_on" })
    .select("id, starts_on");
  if (weekError) throw weekError;
  const weekId = new Map((weekRows ?? []).map((w) => [w.starts_on, w.id]));

  const now = new Date().toISOString();
  const { error: fixtureError } = await admin.from("fixtures").upsert(
    rows.map((r) => ({
      highlightly_match_id: r.highlightly_match_id,
      competition: r.competition,
      season: r.season,
      pl_round: r.pl_round,
      kickoff_at: r.kickoff_at,
      matchweek_id: weekId.get(r.matchweek_starts_on) ?? null,
      home_club_id: byTeam.get(r.home_team)!,
      away_club_id: byTeam.get(r.away_team)!,
      status: r.status,
      home_score: r.home_score,
      away_score: r.away_score,
      updated_at: now,
    })),
    { onConflict: "highlightly_match_id" },
  );
  if (fixtureError) throw fixtureError;

  return {
    calls,
    fixtures: plRows.length,
    ucl: uclRows.length,
    finished: rows.filter((r) => r.status === "finished").length,
    unknownTeams: [...unknown.values()],
  };
}
