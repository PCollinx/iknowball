import { normalizeName } from "@/lib/daily/match";
import { pickIssues, recallIssues, shownChoices, type OrderLine, type PickLine, type RecallLine } from "@/lib/maker/parse";

// Builds a day's two parts from shared club histories. Pure, so the choices
// can be tested; the job in draft-job.ts feeds it data and saves the result.

/** A Free Recall list this size is fun to play: long enough to chase, short enough to finish. */
export const MIN_SHARED = 6;
export const MAX_SHARED = 25;
export const ORDER_SIZE = 5;
/** In Order's clock (Collins, 30 Oct 2026: a minute was too long for five names). */
export const ORDER_SECONDS = 45;
/** Rapid picks: questions in a round, and the fewest worth playing. */
export const PICK_SIZE = 10;
export const MIN_PICKS = 5;
/** Era picks: questions in a round, and the fewest worth playing. */
export const ERA_SIZE = 5;
export const MIN_ERAS = 4;
/** Famous players in the Daily too (Collins, 29 Oct 2026): In Order and Era
 * picks choose from a club's best known this many, and Rapid picks' wrong
 * options come from them, so the names are ones people know. */
export const KNOWN_POOL = 20;
/** Rapid picks' right answers need this many Wikipedia editions on them, when enough do. */
export const MIN_FAME = 12;

export type Club = { id: number; name: string };
export type PairCandidate = { a: number; b: number; players: number };
/** `fame` is how well known a player is (Wikipedia editions with an article on them); unknown counts as 0. */
export type SharedPlayer = { id: number; name: string; aliases: string[]; joinedA: string | null; joinedB: string | null; fame?: number };

const fameOf = (p: { fame?: number }) => p.fame ?? 0;

/** The n best known, in the order they came. */
function bestKnown<T extends { fame?: number }>(items: T[], n: number): T[] {
  if (items.length <= n) return items;
  const keep = new Set([...items].sort((a, b) => fameOf(b) - fameOf(a)).slice(0, n));
  return items.filter((x) => keep.has(x));
}

export const pairKey = (a: number, b: number) => (a < b ? `${a}-${b}` : `${b}-${a}`);

/** A number from a string, the same every time (FNV-1a). */
export function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Which clubs make a popular Daily (Collins, 29 Oct 2026): the Premier
 * League's big six, and Europe's giants for Champions League nights. */
export type PairRules = { bigSix: Set<number>; europe: Set<number> };

/**
 * The club pair for a day, picked by the date so a rerun picks the same one.
 * Without rules: the first of the fixtures that makes a good list and hasn't
 * been used lately, otherwise any good unused pair. With rules, every Daily is
 * a game people know: on a Champions League night a UCL tie with a top club
 * (the big six's first); otherwise a fixture with one of the big six, then a
 * pair of big six clubs, then one of them against another English club. If
 * every such pair was used lately, one is reused rather than going obscure.
 */
export function pickPair(
  date: string,
  candidates: PairCandidate[],
  fixtures: [number, number][],
  used: Set<string>,
  rested: Set<number> = new Set(),
  rules?: PairRules,
  ucl: [number, number][] = [],
): [number, number] | null {
  const good = new Map(
    candidates.filter((c) => c.players >= MIN_SHARED && c.players <= MAX_SHARED).map((c) => [pairKey(c.a, c.b), c]),
  );
  const free = (a: number, b: number) => good.has(pairKey(a, b)) && !used.has(pairKey(a, b));
  const big = (id: number) => rules?.bigSix.has(id) ?? false;
  const popular = (a: number, b: number) => !rules || ((big(a) || big(b)) && !rules.europe.has(a) && !rules.europe.has(b));

  if (rules) {
    const top = (id: number) => big(id) || rules.europe.has(id);
    const ties = [...ucl.filter(([h, a]) => big(h) || big(a)), ...ucl.filter(([h, a]) => !big(h) && !big(a))];
    for (const [home, away] of ties) if ((top(home) || top(away)) && free(home, away)) return [home, away];
  }
  for (const [home, away] of fixtures) if (popular(home, away) && free(home, away)) return [home, away];

  const byKey = (x: [string, PairCandidate], y: [string, PairCandidate]) => (x[0] < y[0] ? -1 : 1);
  const unused = [...good.entries()].filter(([key, c]) => !used.has(key) && popular(c.a, c.b)).sort(byKey);
  // Two of the big six before one; off a fixture, clubs that featured on nearby
  // days are kept out when there's a choice.
  const tiers = rules ? [unused.filter(([, c]) => big(c.a) && big(c.b)), unused.filter(([, c]) => !(big(c.a) && big(c.b)))] : [unused];
  const isFresh = ([, c]: [string, PairCandidate]) => !rested.has(c.a) && !rested.has(c.b);
  const pick = (open: [string, PairCandidate][]): [number, number] => {
    const [, c] = open[hash(date) % open.length];
    return [c.a, c.b];
  };
  for (const tier of tiers) if (tier.some(isFresh)) return pick(tier.filter(isFresh));
  for (const tier of tiers) if (tier.length) return pick(tier);
  if (!rules) return null;
  const again = [...good.entries()].filter(([, c]) => popular(c.a, c.b)).sort(byKey);
  return again.length ? pick(again) : null;
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
 * era, earliest first. The best known go in, widening only until there are
 * enough years; players used in recent Dailies are picked last.
 */
export function orderAnswers(players: SharedPlayer[], joined: "joinedA" | "joinedB", recent: Set<string>, seed: number): OrderLine[] {
  const dated = players.filter((p) => (p[joined] ?? "") >= "1992-08-15");
  let byYear = new Map<string, SharedPlayer[]>();
  for (let n = KNOWN_POOL; ; n *= 2) {
    byYear = new Map();
    for (const p of bestKnown(dated, n)) {
      const y = p[joined]!.slice(0, 4);
      byYear.set(y, [...(byYear.get(y) ?? []), p]);
    }
    if (byYear.size >= ORDER_SIZE || n >= dated.length) break;
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

// ---------------------------------------------------------------------------
// Rapid picks and Era picks
// ---------------------------------------------------------------------------

/** A player who played for only one of the two clubs: a wrong option. */
export type Decoy = { id: number; name: string; club: number; fame?: number };
/** A dated spell at one club: an Era picks question. */
export type DatedSpell = { id: number; name: string; joined: string; left: string; fame?: number };

/** Rotates a list by a seed, so a rerun picks the same items. */
function rotate<T>(items: T[], seed: number): T[] {
  if (!items.length) return items;
  const k = seed % items.length;
  return [...items.slice(k), ...items.slice(0, k)];
}

/**
 * Part 1 as Rapid picks: each question has one player who played for both
 * clubs and three who played for just one of them, so nobody wins on club
 * alone. Right answers are well known when enough are, best known first,
 * players used lately last; wrong ones are among each club's best known. No
 * option repeats in a round.
 */
export function rapidPicks(shared: SharedPlayer[], decoys: Decoy[], home: Club, away: Club, recent: Set<string>, seed: number): PickLine[] {
  const sharedNames = new Set(shared.map((p) => normalizeName(p.name)));
  const known = shared.filter((p) => fameOf(p) >= MIN_FAME);
  const isRecent = (p: SharedPlayer) => Number(recent.has(normalizeName(p.name)));
  const right = rotate(known.length >= MIN_PICKS ? known : shared, seed).sort((p, q) => isRecent(p) - isRecent(q) || fameOf(q) - fameOf(p));
  const seen = new Set<string>();
  const pool = (club: number) =>
    rotate(
      bestKnown(
        decoys.filter((d) => {
          const k = normalizeName(d.name);
          return d.club === club && k && !sharedNames.has(k);
        }),
        KNOWN_POOL,
      ),
      seed,
    );
  const sides = [pool(home.id), pool(away.id)];
  const take = (i: number): string | null => {
    // Alternate clubs, falling back to the other when one runs dry.
    for (const side of [sides[i % 2], sides[(i + 1) % 2]]) {
      while (side.length) {
        const d = side.shift()!;
        const k = normalizeName(d.name);
        if (!seen.has(k)) {
          seen.add(k);
          return d.name;
        }
      }
    }
    return null;
  };

  const lines: PickLine[] = [];
  for (const p of right) {
    if (lines.length === PICK_SIZE) break;
    const k = normalizeName(p.name);
    if (!k || seen.has(k)) continue;
    const wrong = [take(lines.length), take(lines.length + 1), take(lines.length + 2)].filter((x): x is string => x !== null);
    if (wrong.length < 3) break;
    seen.add(k);
    lines.push({ question: null, answer: p.name, wrong });
  }
  return lines.length >= MIN_PICKS && !pickIssues(lines, "pick").errors.length ? lines : [];
}

const period = (from: number, to: number) => `${from}–${to}`;

/** Three wrong periods as long as the real one, before and after it, inside the Premier League era. */
export function eraDecoys(from: number, to: number, seed: number, nowYear: number): string[] | null {
  const span = to - from;
  const step = Math.max(2, Math.ceil(span / 2));
  const offsets = [step, -step, 2 * step, -2 * step, 3 * step, -3 * step];
  const valid = offsets.map((o) => from + o).filter((f) => f >= 1990 && f + span <= nowYear);
  if (valid.length < 3) return null;
  return rotate(valid, seed).slice(0, 3).map((f) => period(f, f + span));
}

/**
 * Part 2 as Era picks: the club's best known players with both dates known,
 * spread across the era, each asked when they were there.
 */
export function eraPicks(spells: DatedSpell[], club: Club, recent: Set<string>, seed: number, nowYear: number): PickLine[] {
  // One spell a player (the longest), at least a year long, in the Premier League era.
  const byPlayer = new Map<number, { name: string; from: number; to: number; fame?: number }>();
  for (const s of spells) {
    const from = Number(s.joined.slice(0, 4));
    const to = Number(s.left.slice(0, 4));
    if (from < 1992 || to <= from || to > nowYear) continue;
    const had = byPlayer.get(s.id);
    if (!had || to - from > had.to - had.from) byPlayer.set(s.id, { name: s.name, from, to, fame: s.fame });
  }
  const fresh = (n: string) => !recent.has(normalizeName(n));
  const all = [...byPlayer.values()].sort((a, b) => a.from - b.from || a.name.localeCompare(b.name));
  const pool = bestKnown(all.filter((p) => fresh(p.name)).length >= ERA_SIZE ? all.filter((p) => fresh(p.name)) : all, KNOWN_POOL);
  if (pool.length < MIN_ERAS) return [];

  // Evenly spread through the years, like In Order.
  const n = Math.min(ERA_SIZE, pool.length);
  const offset = seed % Math.max(1, Math.floor(pool.length / n));
  const picks = Array.from({ length: n }, (_, i) => pool[Math.min(pool.length - 1, Math.floor((i * pool.length) / n) + offset)]);
  const lines: PickLine[] = [];
  for (const [i, p] of [...new Set(picks)].entries()) {
    const wrong = eraDecoys(p.from, p.to, seed + i, nowYear);
    if (wrong) lines.push({ question: `${p.name} at ${club.name}`, answer: period(p.from, p.to), wrong });
  }
  return lines.length >= MIN_ERAS && !pickIssues(lines, "era").errors.length ? lines : [];
}

/** Seconds for a picks round: about six a question, at least 30. */
export function pickSeconds(questions: number, era = false): number {
  return Math.max(30, Math.round(((era ? 9 : 6) * questions) / 5) * 5);
}

// ---------------------------------------------------------------------------
// A whole day
// ---------------------------------------------------------------------------

/** One answer row, as public.maker_save_day takes it. */
export type DraftAnswer = {
  answer_text: string;
  extra_aliases: string[];
  position: number | null;
  reveal_note: string | null;
  question?: string | null;
  choices?: string[];
};
export type DraftPart = { format: "free_recall" | "pick" | "in_order" | "era"; title: string; prompt: string; time: number; answers: DraftAnswer[] };
export type DraftDay = { part1: DraftPart; part2: DraftPart | null };

/** What the picks rounds are built from. Without it, a day gets the typed rounds. */
export type PickData = { decoys: Decoy[]; spells: Map<number, DatedSpell[]>; nowYear: number };

const pickAnswers = (lines: PickLine[]): DraftAnswer[] =>
  lines.map((l, i) => ({ answer_text: l.answer, extra_aliases: [], position: i + 1, reveal_note: null, question: l.question, choices: shownChoices(l) }));

/** The day's round types, mixed (Collins, 19 Oct 2026): the four pairings take
 * turns by date, so every week gets each of them and Part 1 and Part 2 both
 * change from one day to the next. */
const PAIRINGS = [
  { rapid: true, era: false },
  { rapid: false, era: true },
  { rapid: true, era: true },
  { rapid: false, era: false },
] as const;

export function pairingFor(date: string): (typeof PAIRINGS)[number] {
  const day = Math.round(Date.parse(`${date}T00:00:00Z`) / 86_400_000);
  return PAIRINGS[((day % 4) + 4) % 4];
}

/** Part 1 is Rapid picks or Free Recall, Part 2 Era picks or In Order, by
 * `pairingFor`. A picks round the data can't fill falls back to the typed one. */
export function draftDay(date: string, home: Club, away: Club, players: SharedPlayer[], recent: Set<string>, picks?: PickData): DraftDay {
  const typed = typedDay(date, home, away, players, recent);
  if (!picks) return typed;
  const seed = hash(date);
  const pairing = pairingFor(date);

  const rapid = pairing.rapid ? rapidPicks(players, picks.decoys, home, away, recent, seed) : [];
  const part1: DraftPart = rapid.length
    ? {
        format: "pick",
        title: `${home.name} v ${away.name}`,
        prompt: `Tap the player who's played for both ${home.name} and ${away.name} since 1992.`,
        time: pickSeconds(rapid.length),
        answers: pickAnswers(rapid),
      }
    : typed.part1;

  if (pairing.era) {
    for (const club of seed % 2 ? [away, home] : [home, away]) {
      const era = eraPicks(picks.spells.get(club.id) ?? [], club, recent, seed, picks.nowYear);
      if (era.length)
        return {
          part1,
          part2: { format: "era", title: "Era picks", prompt: `When were they at ${club.name}? Tap the right years.`, time: pickSeconds(era.length, true), answers: pickAnswers(era) },
        };
    }
  }
  return { part1, part2: typed.part2 };
}

/** Free Recall and In Order. */
function typedDay(date: string, home: Club, away: Club, players: SharedPlayer[], recent: Set<string>): DraftDay {
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
      format: "free_recall",
      title: `${home.name} v ${away.name}`,
      prompt: `Name the ${answers.length} players who've played for both ${home.name} and ${away.name} since 1992.`,
      time: recallSeconds(answers.length),
      answers: answers.map((a) => ({ answer_text: a.text, extra_aliases: a.aliases, position: null, reveal_note: null })),
    },
    part2: order.length
      ? {
          format: "in_order",
          title: "In order",
          prompt: `They all played for ${club.name}. Who joined first? Earliest at the top.`,
          time: ORDER_SECONDS,
          answers: order.map((a, i) => ({ answer_text: a.text, extra_aliases: [], position: i + 1, reveal_note: a.note })),
        }
      : null,
  };
}
