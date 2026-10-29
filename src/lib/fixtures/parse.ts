import { gameDate, matchweekBounds, seasonOf } from "@/lib/time";

// Turns Highlightly's /matches rows into our fixtures. Pure, so it's tested
// against a saved response rather than the API.

export type HighlightlyTeam = { id: number; name: string };
export type HighlightlyMatch = {
  id: number;
  round: string | null;
  date: string;
  homeTeam: HighlightlyTeam;
  awayTeam: HighlightlyTeam;
  state: { description: string | null; score: { current: string | null } | null } | null;
};

export type FixtureStatus = "scheduled" | "live" | "finished" | "postponed" | "cancelled";

/** "Regular Season - 26" → 26. */
export function plRound(round: string | null): number | null {
  const n = round?.match(/(\d+)\s*$/)?.[1];
  return n ? Number(n) : null;
}

/** "3 - 1" → [3, 1]. */
export function parseScore(score: string | null | undefined): [number, number] | null {
  const m = score?.match(/^\s*(\d+)\s*-\s*(\d+)\s*$/);
  return m ? [Number(m[1]), Number(m[2])] : null;
}

export function statusOf(description: string | null | undefined, hasScore: boolean): FixtureStatus {
  const d = (description ?? "").toLowerCase();
  if (d.startsWith("finished")) return "finished";
  if (d.includes("postponed") || d.includes("suspended") || d.includes("delayed")) return "postponed";
  if (d.includes("cancel") || d.includes("abandon")) return "cancelled";
  if (d === "" || d.includes("not started") || d.includes("to be")) return hasScore ? "live" : "scheduled";
  return "live";
}

// Highlightly's team names that differ from ours (ours are what fans say).
const ALIASES: Record<string, string> = {
  "manchester city": "man city",
  "manchester united": "man united",
  "newcastle united": "newcastle",
  tottenham: "spurs",
  "tottenham hotspur": "spurs",
  "hull city": "hull",
  "ipswich town": "ipswich",
  "coventry city": "coventry",
  "leeds united": "leeds",
  "brighton & hove albion": "brighton",
  "wolverhampton wanderers": "wolves",
  "west ham united": "west ham",
  "afc bournemouth": "bournemouth",
  "nottm forest": "nottingham forest",
  "paris saint germain": "psg",
  "paris saint-germain": "psg",
  "inter milan": "inter",
  "borussia dortmund": "dortmund",
  "atletico madrid": "atlético madrid",
  "fc barcelona": "barcelona",
  "bayern münchen": "bayern munich",
  "milan": "ac milan",
};

/** Our club name for one of Highlightly's, lower-cased. */
export function clubKey(name: string): string {
  const key = name.trim().toLowerCase();
  return ALIASES[key] ?? key;
}

/** The competitions we sync: the Premier League, and the Champions League for UCL nights. */
export type Competition = "PL" | "UCL";

export type FixtureRow = {
  highlightly_match_id: number;
  competition: Competition;
  season: number;
  pl_round: number | null;
  kickoff_at: string;
  matchweek_starts_on: string;
  home_team: number;
  away_team: number;
  status: FixtureStatus;
  home_score: number | null;
  away_score: number | null;
};

export function fixtureOf(m: HighlightlyMatch, competition: Competition = "PL"): FixtureRow {
  const score = parseScore(m.state?.score?.current);
  const status = statusOf(m.state?.description, Boolean(score));
  const kickoff = new Date(m.date);
  const day = gameDate(kickoff);
  return {
    highlightly_match_id: m.id,
    competition,
    season: seasonOf(day),
    // UCL rounds ("League Stage - 3") aren't Premier League rounds.
    pl_round: competition === "PL" ? plRound(m.round) : null,
    kickoff_at: kickoff.toISOString(),
    matchweek_starts_on: matchweekBounds(day).startsOn,
    home_team: m.homeTeam.id,
    away_team: m.awayTeam.id,
    status,
    home_score: score && status !== "scheduled" ? score[0] : null,
    away_score: score && status !== "scheduled" ? score[1] : null,
  };
}
