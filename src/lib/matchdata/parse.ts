import { normalizeName } from "@/lib/daily/match";

// Template build D: Highlightly's match details, box scores and standings as
// our rows. Pure, so it's tested against saved responses rather than the API.

export type HighlightlyEvent = {
  team: { id: number; name: string };
  time: string;
  type: string;
  playerId?: number | null;
  player?: string | null;
  assistingPlayerId?: number | null;
  assist?: string | null;
};

export type EventType = "goal" | "own-goal" | "penalty" | "missed-penalty" | "yellow" | "red";
export type EventRow = {
  seq: number;
  minute: string;
  type: EventType;
  teamId: number;
  playerHlId: number | null;
  playerName: string;
  assistHlId: number | null;
  assistName: string | null;
};

const TYPES: Record<string, EventType> = {
  Goal: "goal",
  "Own Goal": "own-goal",
  Penalty: "penalty",
  "Missed Penalty": "missed-penalty",
  "Yellow Card": "yellow",
  "Red Card": "red",
};

/** "45+1" → 45.01, so events sort in match order (Highlightly's list isn't). */
export const minuteOrder = (time: string) => {
  const [base, extra] = time.split("+").map((n) => Number.parseInt(n, 10) || 0);
  return base + (extra ?? 0) / 100;
};

/**
 * The goals, penalties and cards of a match, in order. Substitutions are
 * left out; a goal VAR cancelled afterwards (the team's latest goal before the
 * call) goes too.
 */
export function eventsOf(events: HighlightlyEvent[]): EventRow[] {
  const sorted = events.map((e, i) => ({ e, i })).sort((a, b) => minuteOrder(a.e.time) - minuteOrder(b.e.time) || a.i - b.i);
  const rows: EventRow[] = [];
  for (const { e } of sorted) {
    if (e.type.startsWith("VAR Goal Cancelled")) {
      const last = rows.findLastIndex((r) => r.teamId === e.team.id && (r.type === "goal" || r.type === "penalty"));
      if (last >= 0) rows.splice(last, 1);
      continue;
    }
    const type = TYPES[e.type];
    if (!type || !e.player) continue;
    rows.push({
      seq: 0,
      minute: e.time,
      type,
      teamId: e.team.id,
      playerHlId: e.playerId ?? null,
      playerName: e.player,
      assistHlId: e.assistingPlayerId ?? null,
      assistName: e.assist ?? null,
    });
  }
  return rows.map((r, i) => ({ ...r, seq: i + 1 }));
}

type Num = number | string | null | undefined;
export type HighlightlyBoxPlayer = {
  id: number;
  name: string;
  fullName?: string | null;
  position?: string | null;
  shirtNumber?: number | null;
  minutesPlayed?: number | null;
  isSubstitute?: boolean | null;
  matchRating?: string | null;
  statistics: Record<string, Num>;
};
export type HighlightlyBoxTeam = { team: { id: number; name: string }; players: HighlightlyBoxPlayer[] };

export type Position = "GK" | "DEF" | "MID" | "FWD";
const POSITIONS: Record<string, Position> = { Goalkeeper: "GK", Defender: "DEF", Midfielder: "MID", Forward: "FWD" };

export type BoxRow = {
  teamId: number;
  hlId: number;
  name: string;
  fullName: string;
  position: Position | null;
  shirt: number | null;
  minutes: number;
  started: boolean;
  rating: number | null;
  goals: number;
  assists: number;
  shots: number;
  keyPasses: number;
  dribblesTotal: number;
  dribblesSuccessful: number;
  duelsTotal: number;
  duelsWon: number;
  tackles: number;
  interceptions: number;
  xg: number | null;
  xa: number | null;
  yellow: number;
  red: number;
};

const num = (v: Num): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number.parseFloat(v);
  return Number.isFinite(n) ? n : null;
};
const count = (v: Num) => num(v) ?? 0;

/** Every player in a box score, both teams. Unused substitutes have 0 minutes. */
export function boxRowsOf(teams: HighlightlyBoxTeam[]): BoxRow[] {
  return teams.flatMap(({ team, players }) =>
    players.map((p) => {
      const s = p.statistics ?? {};
      const minutes = count(p.minutesPlayed);
      return {
        teamId: team.id,
        hlId: p.id,
        name: p.name,
        fullName: p.fullName || p.name,
        position: POSITIONS[p.position ?? ""] ?? null,
        shirt: p.shirtNumber ?? null,
        minutes,
        started: !p.isSubstitute && minutes > 0,
        rating: num(p.matchRating),
        goals: count(s.goalsScored),
        assists: count(s.assists),
        shots: count(s.shotsTotal),
        keyPasses: count(s.passesKey),
        dribblesTotal: count(s.dribblesTotal),
        dribblesSuccessful: count(s.dribblesSuccessful),
        duelsTotal: count(s.duelsTotal),
        duelsWon: count(s.duelsWon),
        tackles: count(s.tacklesTotal),
        interceptions: count(s.interceptionsTotal),
        xg: num(s.expectedGoals),
        xa: num(s.expectedAssists),
        yellow: count(s.cardsYellow) + count(s.cardsSecondYellow),
        red: count(s.cardsRed),
      };
    }),
  );
}

type Record5 = { games: number; wins: number; draws: number; loses: number; scoredGoals: number; receivedGoals: number };
export type HighlightlyStandings = {
  groups: { name: string; standings: { position: number; points: number; team: { id: number; name: string }; total: Record5 }[] }[];
};
export type TableRow = { teamId: number; teamName: string; position: number; played: number; won: number; drawn: number; lost: number; gf: number; ga: number; points: number };

/** The league table, from the first group (the Premier League has one). */
export function tableOf(s: HighlightlyStandings): TableRow[] {
  return (s.groups[0]?.standings ?? []).map((r) => ({
    teamId: r.team.id,
    teamName: r.team.name,
    position: r.position,
    played: r.total.games,
    won: r.total.wins,
    drawn: r.total.draws,
    lost: r.total.loses,
    gf: r.total.scoredGoals,
    ga: r.total.receivedGoals,
    points: r.points,
  }));
}

export type Candidate = { id: number; knownAs: string; fullName: string; aliases: string[] };

const words = (s: string) => normalizeName(s).split(" ").filter(Boolean);
/** "M. Gusto", "J. Sancho": an initial, then the surname. */
const ABBREVIATED = /^\p{L}\.\s/u;

/**
 * Our player for one of Highlightly's, from the players we know at his club:
 * the same name; an initial and surname that fit just one ("M. Gusto"); or
 * every word of our name inside his full name ("Moisés Caicedo" in "Moisés
 * Isaac Caicedo Corozo"). Null when none or more than one fit.
 */
export function matchPlayer(hl: { name: string; fullName: string }, candidates: Candidate[]): number | null {
  const one = (fits: Candidate[]) => (fits.length === 1 ? fits[0].id : null);
  const name = normalizeName(hl.name);
  const full = normalizeName(hl.fullName);
  const exact = candidates.filter((c) => [c.knownAs, c.fullName, ...c.aliases].some((n) => [name, full].includes(normalizeName(n))));
  if (exact.length) return one(exact);

  if (ABBREVIATED.test(hl.name.trim())) {
    const [initial, ...rest] = words(hl.name);
    const surname = rest.join(" ");
    const fits = candidates.filter((c) => {
      const w = words(c.knownAs);
      return w.length > 1 && w[0][0] === initial && w.slice(1).join(" ").endsWith(surname);
    });
    if (fits.length) return one(fits);
  }

  const fullWords = new Set(words(hl.fullName));
  return one(candidates.filter((c) => words(c.knownAs).length > 1 && words(c.knownAs).every((w) => fullWords.has(w))));
}

/** The name a player new to us goes by: Highlightly's, or "first last" of his full name when it's abbreviated. */
export function shirtName(hl: { name: string; fullName: string }): string {
  if (!ABBREVIATED.test(hl.name.trim())) return hl.name.trim();
  const w = hl.fullName.trim().split(/\s+/);
  return w.length > 1 ? `${w[0]} ${w[w.length - 1]}` : hl.fullName.trim();
}
