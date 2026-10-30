import { normalizeName } from "@/lib/daily/match";
import { pickIssues, type OrderLine, type PickLine } from "@/lib/maker/parse";
import { MAX_SHARED, MIN_PICKS, MIN_SHARED, ORDER_SIZE, PICK_SIZE, type SharedPlayer } from "./generate";
import { rotate } from "./templates";

// Template build D (Collins, 30 Oct 2026): the templates answered from what
// happens in matches (Highlightly, src/lib/matchdata). Pure, like
// templates.ts. Drafts are made days ahead, so a question names its match or
// its date ("the table on Sat 1 Nov") instead of saying "last weekend".

/** One player's line in a box score. */
export type MatchLine = { player: number; club: number; started: boolean; minutes: number; rating: number | null; keyPasses: number; goals: number; position: string | null };
/** A goal; own goals count for the other side and are never anyone's answer. */
export type MatchGoal = { player: number | null; club: number; ownGoal: boolean };
export type PlayedMatch = {
  date: string;
  home: number;
  away: number;
  homeGoals: number;
  awayGoals: number;
  goals: MatchGoal[];
  /** Empty for meetings before this season (no box scores). */
  lines: MatchLine[];
};
export type MatchPlayer = { name: string; fame: number; nationality: string | null };
export type MatchData = {
  /** The date the data runs to: questions say "by" it. */
  asOf: string;
  /** The Premier League table that day. */
  table: { club: number; position: number; points: number; played: number }[];
  /** This season's Premier League matches with their details, newest first. */
  matches: PlayedMatch[];
  /**
   * Every finished Premier League match this season has its details. The
   * season-wide templates wait for it: while the nightly job is still filling
   * the season in, "who's started for Arsenal" would leave out right answers.
   */
  seasonComplete: boolean;
  /** The day's pair's past meetings (any competition we sync), newest first. */
  meetings: PlayedMatch[];
  players: Map<number, MatchPlayer>;
  clubName: Map<number, string>;
  /** Spells at the day's clubs, for wrong options in old meetings. */
  spellsAt: Map<number, { id: number; name: string; fame: number; joined: string | null; left: string | null }[]>;
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
/** "Sat 1 Nov". */
export const dayLabel = (date: string) => {
  const d = new Date(`${date}T12:00:00Z`);
  return `${WEEKDAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
};
/** "Apr 2024". */
const monthLabel = (date: string) => `${MONTHS[Number(date.slice(5, 7)) - 1]} ${date.slice(0, 4)}`;
const ordinal = (n: number) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? "th" : (["th", "st", "nd", "rd"][n % 10] ?? "th")}`;

/** "Arsenal 2–0 Burnley". */
export const scoreline = (m: PlayedMatch, clubName: Map<number, string>) => `${clubName.get(m.home)} ${m.homeGoals}–${m.awayGoals} ${clubName.get(m.away)}`;

const asShared = (ids: number[], d: MatchData): SharedPlayer[] =>
  ids.map((id) => ({ id, name: d.players.get(id)!.name, aliases: [], joinedA: null, joinedB: null, fame: d.players.get(id)!.fame }));
/** A list Free Recall can take: enough names, not too many, one per name. */
const fair = (ids: number[], d: MatchData) => {
  const named = [...new Map(ids.filter((id) => d.players.has(id)).map((id) => [normalizeName(d.players.get(id)!.name), id])).values()];
  return named.length >= MIN_SHARED && named.length <= MAX_SHARED ? asShared(named, d) : null;
};
const fame = (d: MatchData, id: number) => d.players.get(id)?.fame ?? 0;

/** Free Recall #6: the Nigerians who've played in the Premier League this season. */
export function superEaglesNow(d: MatchData): SharedPlayer[] | null {
  if (!d.seasonComplete) return null;
  const played = new Set(d.matches.flatMap((m) => m.lines.filter((l) => l.minutes > 0).map((l) => l.player)));
  return fair([...played].filter((id) => d.players.get(id)?.nationality === "Nigeria"), d);
}

/** Free Recall #7: who's started a Premier League game for the club this season. */
export function startersThisSeason(d: MatchData, club: number): SharedPlayer[] | null {
  if (!d.seasonComplete) return null;
  return fair([...new Set(d.matches.flatMap((m) => m.lines.filter((l) => l.club === club && l.started).map((l) => l.player)))], d);
}

/** Free Recall #8: who's scored for the club in the Premier League this season (own goals aside). */
export function clubScorers(d: MatchData, club: number): SharedPlayer[] | null {
  if (!d.seasonComplete) return null;
  return fair([...new Set(d.matches.flatMap((m) => m.goals.filter((g) => g.club === club && !g.ownGoal && g.player !== null).map((g) => g.player!)))], d);
}

/** Three of `pool` not in `not`, best known first, varied by the seed. */
function wrongFrom(pool: number[], not: Set<number>, d: MatchData, seed: number): string[] | null {
  const names = [...new Set(pool)].filter((id) => !not.has(id) && d.players.has(id)).sort((a, b) => fame(d, b) - fame(d, a));
  const three = rotate(names.slice(0, 7), seed).slice(0, 3).map((id) => d.players.get(id)!.name);
  return new Set(three.map(normalizeName)).size === 3 ? three : null;
}

/** Rapid #7: the day's clubs' recent matches; tap a player who scored. */
export function scoredInMatch(d: MatchData, dayClubs: number[], seed: number): PickLine[] {
  const lines: PickLine[] = [];
  for (const [i, m] of d.matches.filter((m) => dayClubs.includes(m.home) || dayClubs.includes(m.away)).entries()) {
    if (lines.length === PICK_SIZE) break;
    const scorers = new Set(m.goals.filter((g) => !g.ownGoal && g.player !== null).map((g) => g.player!));
    const answer = [...scorers].filter((id) => d.players.has(id)).sort((a, b) => fame(d, b) - fame(d, a))[0];
    if (!answer) continue;
    const wrong = wrongFrom(m.lines.filter((l) => l.minutes > 0).map((l) => l.player), scorers, d, seed + i);
    if (wrong) lines.push({ question: `${scoreline(m, d.clubName)} · ${dayLabel(m.date)}`, answer: d.players.get(answer)!.name, wrong });
  }
  return lines.length >= MIN_PICKS && !pickIssues(lines, "pick").errors.length ? lines : [];
}

/** Rapid #14: the pair's last meetings; tap a player who scored. Wrong options were at either club then. */
export function lastTimeTheyMet(d: MatchData, seed: number): PickLine[] {
  const lines: PickLine[] = [];
  for (const [i, m] of d.meetings.entries()) {
    const scorers = new Set(m.goals.filter((g) => !g.ownGoal && g.player !== null).map((g) => g.player!));
    const answer = [...scorers].filter((id) => d.players.has(id)).sort((a, b) => fame(d, b) - fame(d, a))[0];
    if (!answer) continue;
    // Whoever was at either club around the day, by their spells, else by who played.
    const then = [m.home, m.away].flatMap((c) =>
      (d.spellsAt.get(c) ?? []).filter((s) => (!s.joined || s.joined <= m.date) && (!s.left || s.left >= m.date)).map((s) => s.id),
    );
    const wrong = wrongFrom([...then, ...m.lines.map((l) => l.player)], scorers, d, seed + i);
    if (wrong) lines.push({ question: `${scoreline(m, d.clubName)} · ${monthLabel(m.date)}`, answer: d.players.get(answer)!.name, wrong });
  }
  return lines.length >= MIN_PICKS && !pickIssues(lines, "pick").errors.length ? lines : [];
}

/** Five rows two or more apart by `value`, the ones that must be in first. */
function spread<T>(must: T[], pool: T[], value: (x: T) => number, gap: number): T[] | null {
  const out: T[] = [];
  for (const x of [...must, ...pool]) {
    if (out.every((o) => Math.abs(value(o) - value(x)) >= gap)) out.push(x);
    if (out.length === ORDER_SIZE) break;
  }
  return out.length === ORDER_SIZE && must.every((m) => out.includes(m)) ? out : null;
}

/** In Order #7: five clubs by where they stood in the table, the day's clubs among them. */
export function tableOrder(d: MatchData, dayClubs: number[], seed: number): OrderLine[] {
  if (Math.min(...d.table.map((t) => t.played)) < 3) return [];
  const ours = d.table.filter((t) => dayClubs.includes(t.club));
  if (ours.length !== dayClubs.length) return [];
  const five = spread(ours, rotate(d.table.filter((t) => !ours.includes(t)), seed), (t) => t.position, 2);
  return five ? five.sort((a, b) => a.position - b.position).map((t) => ({ text: d.clubName.get(t.club)!, note: `${ordinal(t.position)} · ${t.points} pts` })) : [];
}

/** Season totals a player, this season's Premier League. */
function totals(d: MatchData) {
  const out = new Map<number, { goals: number; club: number }>();
  for (const m of d.matches) for (const l of m.lines) out.set(l.player, { goals: (out.get(l.player)?.goals ?? 0) + l.goals, club: l.club });
  return out;
}

/** In Order #8: five players by Premier League goals this season, one of the day's clubs' top scorers among them. */
export function seasonGoals(d: MatchData, dayClubs: number[], seed: number): OrderLine[] {
  if (!d.seasonComplete) return [];
  const scorers = [...totals(d)].filter(([id, t]) => t.goals > 0 && d.players.has(id)).map(([id, t]) => ({ id, ...t }));
  const ours = scorers.filter((s) => dayClubs.includes(s.club)).sort((a, b) => b.goals - a.goals || fame(d, b.id) - fame(d, a.id)).slice(0, 1);
  const known = rotate(scorers.filter((s) => !ours.includes(s)).sort((a, b) => fame(d, b.id) - fame(d, a.id)).slice(0, 25), seed);
  const five = ours.length ? spread(ours, known, (s) => s.goals, 1) : null;
  return five ? five.sort((a, b) => b.goals - a.goals).map((s) => ({ text: d.players.get(s.id)!.name, note: `${s.goals} goal${s.goals === 1 ? "" : "s"}` })) : [];
}

/** In Order #9: five outfield players (45 minutes or more, a key pass or more) by key passes in the latest matchweek, the day's clubs' first. */
export function keyPassesOrder(d: MatchData, dayClubs: number[], weekOf: (date: string) => string, seed: number): { week: string; lines: OrderLine[] } | null {
  const latest = d.matches[0];
  if (!latest) return null;
  const week = weekOf(latest.date);
  const lines = d.matches.filter((m) => weekOf(m.date) === week).flatMap((m) => m.lines);
  const pool = lines.filter((l) => l.minutes >= 45 && l.keyPasses > 0 && l.position !== "GK" && d.players.has(l.player));
  const ours = pool.filter((l) => dayClubs.includes(l.club)).sort((a, b) => b.keyPasses - a.keyPasses || fame(d, b.player) - fame(d, a.player)).slice(0, 1);
  const rest = rotate(pool.filter((l) => !ours.includes(l)).sort((a, b) => fame(d, b.player) - fame(d, a.player)).slice(0, 25), seed);
  const five = ours.length ? spread(ours, rest, (l) => l.keyPasses, 1) : null;
  return five ? { week, lines: five.sort((a, b) => b.keyPasses - a.keyPasses).map((l) => ({ text: d.players.get(l.player)!.name, note: `${l.keyPasses} key pass${l.keyPasses === 1 ? "" : "es"}` })) } : null;
}

/** In Order #10: five of a day's club's starters in its latest match, by match rating. */
export function matchRatings(d: MatchData, club: number): { match: PlayedMatch; lines: OrderLine[] } | null {
  const match = d.matches.find((m) => m.home === club || m.away === club);
  if (!match) return null;
  const starters = match.lines.filter((l) => l.club === club && l.started && l.rating !== null && d.players.has(l.player));
  const five = spread([], [...starters].sort((a, b) => fame(d, b.player) - fame(d, a.player)), (l) => l.rating!, 0.3);
  return five ? { match, lines: five.sort((a, b) => b.rating! - a.rating!).map((l) => ({ text: d.players.get(l.player)!.name, note: l.rating!.toFixed(1) })) } : null;
}
