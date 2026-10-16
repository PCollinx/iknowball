import { normalizeName } from "@/lib/daily/match";
import { recallIssues, type OrderLine, type RecallLine } from "@/lib/maker/parse";

// Builds a day's two parts from shared club histories. Pure, so the choices
// can be tested; the job in draft-job.ts feeds it data and saves the result.

/** A Free Recall list this size is fun to play: long enough to chase, short enough to finish. */
export const MIN_SHARED = 6;
export const MAX_SHARED = 25;
export const ORDER_SIZE = 5;

export type Club = { id: number; name: string };
export type PairCandidate = { a: number; b: number; players: number };
export type SharedPlayer = { id: number; name: string; aliases: string[]; joinedA: string | null; joinedB: string | null };

export const pairKey = (a: number, b: number) => (a < b ? `${a}-${b}` : `${b}-${a}`);

/** A number from a string, the same every time (FNV-1a). */
export function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

/**
 * The club pair for a day: the first of that day's fixtures that makes a good
 * list and hasn't been used lately, otherwise any good unused pair, picked by
 * the date so a rerun picks the same one.
 */
export function pickPair(
  date: string,
  candidates: PairCandidate[],
  fixtures: [number, number][],
  used: Set<string>,
): [number, number] | null {
  const good = new Map(
    candidates.filter((c) => c.players >= MIN_SHARED && c.players <= MAX_SHARED).map((c) => [pairKey(c.a, c.b), c]),
  );
  for (const [home, away] of fixtures) {
    const key = pairKey(home, away);
    if (good.has(key) && !used.has(key)) return [home, away];
  }
  const open = [...good.entries()].filter(([key]) => !used.has(key)).sort(([x], [y]) => (x < y ? -1 : 1));
  if (!open.length) return null;
  const [, c] = open[hash(date) % open.length];
  return [c.a, c.b];
}

/** Part 1's answer key, with any alias that would make a guess ambiguous taken out. */
export function recallAnswers(players: SharedPlayer[]): RecallLine[] {
  // Two players with the same name can't both be answers.
  const seen = new Set<string>();
  const unique = players.filter((p) => {
    const k = normalizeName(p.name);
    return k && !seen.has(k) && seen.add(k);
  });
  const lines: RecallLine[] = unique
    .sort((x, y) => x.name.localeCompare(y.name))
    .map((p) => ({ text: p.name, aliases: p.aliases.filter((a) => normalizeName(a) && normalizeName(a) !== normalizeName(p.name)) }));

  // An alias that clashes with any other answer's name, surname or alias goes.
  const surname = (t: string) => normalizeName(t).split(" ").pop() ?? "";
  const claims = new Map<string, number>();
  const claim = (k: string) => claims.set(k, (claims.get(k) ?? 0) + 1);
  for (const l of lines) {
    new Set([normalizeName(l.text), surname(l.text), ...l.aliases.map(normalizeName)]).forEach(claim);
  }
  for (const l of lines) {
    // Aliases equal to the answer's own name or surname add nothing either.
    const own = new Set([normalizeName(l.text), surname(l.text)]);
    l.aliases = [...new Set(l.aliases)].filter((a) => {
      const k = normalizeName(a);
      return claims.get(k) === 1 && !own.has(k);
    });
  }
  if (recallIssues(lines).errors.length) throw new Error("Draft answer key still has clashes");
  return lines;
}

/**
 * Part 2: players who joined one club in different years, spread across the
 * era, earliest first. Players used in recent Dailies are picked last.
 */
export function orderAnswers(players: SharedPlayer[], joined: "joinedA" | "joinedB", recent: Set<string>, seed: number): OrderLine[] {
  const byYear = new Map<string, SharedPlayer[]>();
  for (const p of players) {
    const d = p[joined];
    if (!d || d < "1992-08-15") continue;
    const y = d.slice(0, 4);
    byYear.set(y, [...(byYear.get(y) ?? []), p]);
  }
  const years = [...byYear.keys()].sort();
  if (years.length < ORDER_SIZE) return [];
  // Evenly spaced years, so the order is a fair test rather than a coin toss.
  const picks = Array.from({ length: ORDER_SIZE }, (_, i) => years[Math.round((i * (years.length - 1)) / (ORDER_SIZE - 1))]);
  return picks.map((y, i) => {
    const options = byYear.get(y)!.sort((p, q) => Number(recent.has(normalizeName(p.name))) - Number(recent.has(normalizeName(q.name))));
    const fresh = options.filter((p) => !recent.has(normalizeName(p.name)));
    const pool = fresh.length ? fresh : options;
    const p = pool[(seed + i) % pool.length];
    return { text: p.name, note: y };
  });
}

/** Seconds for a Free Recall list: about five a name, between one and three minutes. */
export function recallSeconds(answers: number): number {
  return Math.min(180, Math.max(60, Math.round((45 + answers * 5) / 5) * 5));
}

export type DraftDay = {
  part1: { title: string; prompt: string; time: number; answers: RecallLine[] };
  part2: { title: string; prompt: string; time: number; answers: OrderLine[] } | null;
};

export function draftDay(date: string, home: Club, away: Club, players: SharedPlayer[], recent: Set<string>): DraftDay {
  const answers = recallAnswers(players);
  const seed = hash(date);
  // Part 2 is about whichever club gives the better spread of signing years.
  const joined = seed % 2 ? "joinedB" : "joinedA";
  let order = orderAnswers(players, joined, recent, seed);
  let club = joined === "joinedA" ? home : away;
  if (!order.length) {
    order = orderAnswers(players, joined === "joinedA" ? "joinedB" : "joinedA", recent, seed);
    club = club === home ? away : home;
  }
  return {
    part1: {
      title: `${home.name} v ${away.name}`,
      prompt: `Name the ${answers.length} players who've played for both ${home.name} and ${away.name} since 1992.`,
      time: recallSeconds(answers.length),
      answers,
    },
    part2: order.length
      ? { title: "In order", prompt: `They all played for ${club.name}. Who joined first? Earliest at the top.`, time: 60, answers: order }
      : null,
  };
}
