import { PATH_ARROW } from "@/components/daily/formats";
import { normalizeName } from "@/lib/daily/match";
import { pickIssues, type OrderLine, type PickLine } from "@/lib/maker/parse";
import { eraDecoys, hash, KNOWN_POOL, MAX_SHARED, MIN_ERAS, MIN_PICKS, MIN_SHARED, ORDER_SIZE, ERA_SIZE, PICK_SIZE, type Club, type SharedPlayer } from "./generate";

// The Daily's newer templates (Collins kept 43 of 66 on 29 Oct 2026; these are
// build A, the ones our club spells already answer). Pure, like generate.ts:
// each takes the day's data and returns its answers, or nothing when the data
// can't make a fair round, so the draft tries the next template.

/** One spell at one club. A null `left` is a spell still running. */
export type ClubSpell = {
  id: number;
  name: string;
  aliases: string[];
  fame: number;
  dob: string | null;
  joined: string | null;
  left: string | null;
  loan: boolean;
  /** Build B's facts, from Wikidata; missing when unknown. */
  nationality?: string | null;
  heightCm?: number | null;
  careerClubs?: number | null;
};
/** One spell in a player's career, at any club we track. */
export type CareerSpell = { club: number; joined: string | null; left: string | null; loan: boolean };

const year = (d: string | null) => (d ? Number(d.slice(0, 4)) : null);
/** All but the first name ("van Persie"), or the one name, as the Daily's tags print it. */
const surname = (name: string) => {
  const words = name.trim().split(/\s+/);
  return words.length > 1 ? words.slice(1).join(" ") : name;
};
const byFame = <T extends { fame?: number }>(a: T, b: T) => (b.fame ?? 0) - (a.fame ?? 0);

/** Rotates a list by a seed, so a rerun picks the same items. */
function rotate<T>(items: T[], seed: number): T[] {
  if (!items.length) return items;
  const k = seed % items.length;
  return [...items.slice(k), ...items.slice(0, k)];
}

/**
 * A loan: marked as one in Wikidata, or (since many aren't) a spell of under
 * two years that sits inside a longer one at another club, the parent club.
 */
export function isLoan(s: CareerSpell, career: CareerSpell[]): boolean {
  if (s.loan) return true;
  const [from, to] = [year(s.joined), year(s.left)];
  if (from === null || to === null || to - from >= 2) return false;
  return career.some((o) => {
    if (o === s || o.club === s.club) return false;
    const [of, ot] = [year(o.joined), o.left === null ? Infinity : year(o.left)];
    return of !== null && ot !== null && of <= from && ot >= to && ot - of > to - from;
  });
}

/** A career without its loans, in the order the clubs were joined. */
export function permanentSpells(career: CareerSpell[]): CareerSpell[] {
  return career
    .filter((s) => s.joined && !isLoan(s, career))
    .sort((a, b) => (a.joined! < b.joined! ? -1 : 1));
}

/** Straight moves in a career: one club left and the next joined the same year or the one after. */
export function moves(career: CareerSpell[]): { from: number; to: number; year: number }[] {
  const spells = permanentSpells(career);
  const out: { from: number; to: number; year: number }[] = [];
  for (let i = 1; i < spells.length; i++) {
    const [a, b] = [spells[i - 1], spells[i]];
    const [left, joined] = [year(a.left), year(b.joined)];
    if (a.club !== b.club && left !== null && joined !== null && joined - left >= 0 && joined - left <= 1) out.push({ from: a.club, to: b.club, year: joined });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Free Recall
// ---------------------------------------------------------------------------

/** Days two spells at a club overlap; a running spell runs to `today`. */
function overlapDays(a: ClubSpell, b: ClubSpell, today: string): number {
  if (!a.joined || !b.joined) return 0;
  const start = Math.max(Date.parse(a.joined), Date.parse(b.joined));
  const end = Math.min(Date.parse(a.left ?? today), Date.parse(b.left ?? today));
  return (end - start) / 86_400_000;
}

/**
 * Part 1 #16: a well-known player's teammates at the club, everyone whose
 * spell overlapped theirs by a season or more. The player is picked among the
 * club's best known whose list is a fair length.
 */
export function dressingRoom(spells: ClubSpell[], recent: Set<string>, seed: number, today: string): { player: ClubSpell; teammates: SharedPlayer[] } | null {
  const dated = spells.filter((s) => s.joined && (s.joined >= "1992-08-15" || (s.left ?? today) >= "1993-08-15"));
  const stars = [...new Map(dated.map((s) => [s.id, s])).values()].sort(byFame).slice(0, KNOWN_POOL);
  const options = stars
    .filter((star) => !recent.has(normalizeName(star.name)))
    .map((star) => {
      const mine = dated.filter((s) => s.id === star.id);
      const mates = new Map<number, SharedPlayer>();
      for (const s of dated) {
        if (s.id === star.id || mates.has(s.id)) continue;
        if (mine.some((m) => overlapDays(m, s, today) >= 365)) mates.set(s.id, { id: s.id, name: s.name, aliases: s.aliases, joinedA: s.joined, joinedB: null, fame: s.fame });
      }
      return { player: star, teammates: [...mates.values()] };
    })
    .filter((o) => o.teammates.length >= MIN_SHARED && o.teammates.length <= MAX_SHARED);
  return options.length ? options[seed % options.length] : null;
}

// ---------------------------------------------------------------------------
// Rapid picks
// ---------------------------------------------------------------------------

/**
 * Part 1 Rapid #3: one player who moved straight between the two clubs
 * (either way) and three who didn't: they played for both with a stop in
 * between, or for just one. Wrong options are the best known.
 */
export function straightSwap(
  shared: SharedPlayer[],
  careers: Map<number, CareerSpell[]>,
  decoys: { name: string; fame?: number }[],
  home: Club,
  away: Club,
  recent: Set<string>,
  seed: number,
): PickLine[] {
  const pair = new Set([home.id, away.id]);
  const direct = (p: SharedPlayer) => moves(careers.get(p.id) ?? []).some((m) => pair.has(m.from) && pair.has(m.to));
  const fresh = (n: string) => Number(recent.has(normalizeName(n)));
  const right = rotate(shared.filter(direct), seed).sort((a, b) => fresh(a.name) - fresh(b.name) || byFame(a, b));
  const wrongPool = rotate(
    [...shared.filter((p) => !direct(p)), ...decoys].sort(byFame).slice(0, KNOWN_POOL * 2),
    seed,
  ).map((p) => p.name);

  const seen = new Set<string>();
  const take = () => {
    while (wrongPool.length) {
      const n = wrongPool.shift()!;
      if (!seen.has(normalizeName(n))) return seen.add(normalizeName(n)) && n;
    }
    return null;
  };
  const lines: PickLine[] = [];
  for (const p of right) {
    if (lines.length === PICK_SIZE) break;
    if (seen.has(normalizeName(p.name))) continue;
    seen.add(normalizeName(p.name));
    const wrong = [take(), take(), take()].filter((x): x is string => Boolean(x));
    if (wrong.length < 3) break;
    lines.push({ question: null, answer: p.name, wrong });
  }
  return lines.length >= MIN_PICKS && !pickIssues(lines, "pick").errors.length ? lines : [];
}

// ---------------------------------------------------------------------------
// In Order
// ---------------------------------------------------------------------------

/** Part 2 #2: five of the club's best known, born in years spread apart, oldest first. */
export function oldestFirst(spells: ClubSpell[], recent: Set<string>, seed: number): OrderLine[] {
  const players = [...new Map(spells.filter((s) => s.dob && (s.left ?? "9999") >= "1992-08-15").map((s) => [s.id, s])).values()];
  const byYear = new Map<number, ClubSpell[]>();
  for (let n = KNOWN_POOL; ; n *= 2) {
    byYear.clear();
    for (const p of [...players].sort(byFame).slice(0, n)) byYear.set(year(p.dob)!, [...(byYear.get(year(p.dob)!) ?? []), p]);
    if (byYear.size >= ORDER_SIZE || n >= players.length) break;
  }
  const years = [...byYear.keys()].sort((a, b) => a - b);
  if (years.length < ORDER_SIZE) return [];
  const picks = Array.from({ length: ORDER_SIZE }, (_, i) => years[Math.round((i * (years.length - 1)) / (ORDER_SIZE - 1))]);
  return picks.map((y, i) => {
    const options = byYear.get(y)!;
    const pool = options.filter((p) => !recent.has(normalizeName(p.name)));
    const p = (pool.length ? pool : options)[(seed + i) % (pool.length || options.length)];
    return { text: p.name, note: String(y) };
  });
}

// ---------------------------------------------------------------------------
// Era picks
// ---------------------------------------------------------------------------

/** Three wrong years near the real one, inside the Premier League era. */
function yearDecoys(y: number, seed: number, nowYear: number): string[] | null {
  const valid = [2, -2, 4, -4, 6, -6].map((o) => y + o).filter((v) => v >= 1992 && v <= nowYear);
  return valid.length < 3 ? null : rotate(valid, seed).slice(0, 3).map(String);
}

/**
 * Part 2 Era #3: when a well-known player moved straight from one club to
 * another, one of them being the day's club. "Ashley Cole at Arsenal → Chelsea".
 */
export function yearOfMove(
  players: { id: number; name: string; fame?: number }[],
  careers: Map<number, CareerSpell[]>,
  clubs: Map<number, Club>,
  dayClubs: Club[],
  recent: Set<string>,
  seed: number,
  nowYear: number,
): PickLine[] {
  const ours = new Set(dayClubs.map((c) => c.id));
  const asked = [...new Map(players.map((p) => [p.id, p])).values()]
    .filter((p) => !recent.has(normalizeName(p.name)))
    .sort(byFame)
    .slice(0, KNOWN_POOL * 2)
    .flatMap((p) => {
      const m = moves(careers.get(p.id) ?? []).find((m) => (ours.has(m.from) || ours.has(m.to)) && m.year >= 1993 && m.year <= nowYear && clubs.has(m.from) && clubs.has(m.to));
      return m ? [{ p, m }] : [];
    });
  const lines: PickLine[] = [];
  const years = new Set<number>();
  for (const [i, { p, m }] of rotate(asked, seed).entries()) {
    if (lines.length === ERA_SIZE) break;
    // Different years, so the round isn't one answer five times.
    if (years.has(m.year)) continue;
    const wrong = yearDecoys(m.year, seed + i, nowYear);
    if (!wrong) continue;
    years.add(m.year);
    lines.push({ question: `${p.name} at ${clubs.get(m.from)!.name} → ${clubs.get(m.to)!.name}`, answer: String(m.year), wrong });
  }
  return lines.length >= MIN_ERAS && !pickIssues(lines, "era").errors.length ? lines : [];
}

/**
 * Part 2 Era #7: when three of the club's best known were all there together,
 * at least two seasons of overlap. "Henry, Bergkamp and Vieira at Arsenal".
 */
export function allThereTogether(spells: ClubSpell[], club: Club, recent: Set<string>, seed: number, nowYear: number): PickLine[] {
  const stays = new Map<number, { name: string; from: number; to: number; fame: number }>();
  for (const s of spells) {
    const [from, to] = [year(s.joined), year(s.left)];
    if (s.loan || from === null || to === null || to <= from || to > nowYear || to < 1993) continue;
    const had = stays.get(s.id);
    if (!had || to - from > had.to - had.from) stays.set(s.id, { name: s.name, from: Math.max(from, 1992), to, fame: s.fame });
  }
  const stars = [...stays.values()].filter((p) => !recent.has(normalizeName(p.name))).sort(byFame).slice(0, KNOWN_POOL);
  const trios: { names: string[]; from: number; to: number }[] = [];
  for (let a = 0; a < stars.length; a++)
    for (let b = a + 1; b < stars.length; b++)
      for (let c = b + 1; c < stars.length; c++) {
        const t = [stars[a], stars[b], stars[c]];
        const [from, to] = [Math.max(...t.map((p) => p.from)), Math.min(...t.map((p) => p.to))];
        if (to - from >= 2) trios.push({ names: t.sort((x, y) => x.from - y.from).map((p) => surname(p.name)), from, to });
      }
  // Spread across the years, no name twice, each period different.
  const lines: PickLine[] = [];
  const used = new Set<string>();
  const periods = new Set<string>();
  for (const [i, t] of rotate(trios, seed).sort((x, y) => x.from - y.from).entries()) {
    if (lines.length === ERA_SIZE) break;
    const answer = `${t.from}–${t.to}`;
    if (periods.has(answer) || t.names.some((n) => used.has(n)) || new Set(t.names).size < 3) continue;
    const wrong = eraDecoys(t.from, t.to, seed + i, nowYear);
    if (!wrong) continue;
    t.names.forEach((n) => used.add(n));
    periods.add(answer);
    lines.push({ question: `${t.names[0]}, ${t.names[1]} and ${t.names[2]} at ${club.name}`, answer, wrong });
  }
  return lines.length >= MIN_ERAS && !pickIssues(lines, "era").errors.length ? lines : [];
}

/** A seed for a template on a day, so each template varies its picks on its own. */
export const templateSeed = (date: string, template: string) => hash(`${date}:${template}`);

// ---------------------------------------------------------------------------
// Career paths (Collins, 29 Oct 2026: B, a trail of kits, and D, kit stickers)
// ---------------------------------------------------------------------------


/** The clubs we track a player joined for good, in order; a club rejoined later counts again, one straight after itself doesn't. */
export function careerClubs(career: CareerSpell[]): { club: number; year: number }[] {
  const out: { club: number; year: number }[] = [];
  for (const s of permanentSpells(career)) if (out.at(-1)?.club !== s.club) out.push({ club: s.club, year: year(s.joined)! });
  return out;
}

/** True when `path` appears in `clubs` in the same order, with other clubs allowed between. */
function followsPath(clubs: number[], path: number[]): boolean {
  let i = 0;
  for (const c of clubs) if (c === path[i]) i++;
  return i === path.length;
}

/**
 * Part 1 Rapid #9: the path of clubs a well-known player took (three to five,
 * one of them the day's), and four players to pick from. A wrong option never
 * followed the same path, even with stops between.
 */
export function careerPathPicks(
  players: { id: number; name: string; fame?: number }[],
  careers: Map<number, CareerSpell[]>,
  clubs: Map<number, Club>,
  dayClubs: Club[],
  recent: Set<string>,
  seed: number,
): PickLine[] {
  const ours = new Set(dayClubs.map((c) => c.id));
  const known = [...new Map(players.map((p) => [p.id, p])).values()].sort(byFame).slice(0, KNOWN_POOL * 2);
  const pathOf = new Map(known.map((p) => [p.id, careerClubs(careers.get(p.id) ?? []).map((c) => c.club)]));
  const asked = rotate(
    known.filter((p) => {
      const path = pathOf.get(p.id)!;
      return path.length >= 3 && path.length <= 5 && path.some((c) => ours.has(c)) && path.every((c) => clubs.has(c)) && !recent.has(normalizeName(p.name));
    }),
    seed,
  );

  const lines: PickLine[] = [];
  const seen = new Set<string>();
  for (const [i, p] of asked.entries()) {
    if (lines.length === PICK_SIZE) break;
    if (seen.has(normalizeName(p.name))) continue;
    const path = pathOf.get(p.id)!;
    const wrong = rotate(known, seed + i)
      .filter((o) => o.id !== p.id && !seen.has(normalizeName(o.name)) && normalizeName(o.name) !== normalizeName(p.name) && !followsPath(pathOf.get(o.id)!, path))
      .slice(0, 3);
    if (wrong.length < 3) continue;
    for (const n of [p, ...wrong]) seen.add(normalizeName(n.name));
    lines.push({ question: path.map((c) => clubs.get(c)!.name).join(PATH_ARROW), answer: p.name, wrong: wrong.map((o) => o.name) });
  }
  return lines.length >= MIN_PICKS && !pickIssues(lines, "pick").errors.length ? lines : [];
}

/**
 * Part 2 In Order #14: a well-known player's clubs (four or five of them, one
 * the day's) in the order he joined them, each joined in a different year.
 */
export function careerPathOrder(
  players: { id: number; name: string; fame?: number }[],
  careers: Map<number, CareerSpell[]>,
  clubs: Map<number, Club>,
  dayClubs: Club[],
  recent: Set<string>,
  seed: number,
): { player: string; lines: OrderLine[] } | null {
  const ours = new Set(dayClubs.map((c) => c.id));
  const options = [...new Map(players.map((p) => [p.id, p])).values()]
    .sort(byFame)
    .slice(0, KNOWN_POOL * 2)
    .filter((p) => !recent.has(normalizeName(p.name)))
    .flatMap((p) => {
      // Each club once, at its first joining, so no name is in the list twice.
      const firsts = new Map<number, number>();
      for (const c of careerClubs(careers.get(p.id) ?? [])) if (!firsts.has(c.club) && clubs.has(c.club)) firsts.set(c.club, c.year);
      const path = [...firsts].map(([club, y]) => ({ club, year: y }));
      if (new Set(path.map((c) => c.year)).size !== path.length || path.length < 4 || !path.some((c) => ours.has(c.club))) return [];
      // Five at most, spread through the career, always keeping the day's club.
      const keep = path.length <= ORDER_SIZE ? path : Array.from({ length: ORDER_SIZE }, (_, i) => path[Math.round((i * (path.length - 1)) / (ORDER_SIZE - 1))]);
      if (!keep.some((c) => ours.has(c.club))) return [];
      return [{ player: p.name, lines: keep.map((c) => ({ text: clubs.get(c.club)!.name, note: String(c.year) })) }];
    });
  return options.length ? options[seed % options.length] : null;
}

// ---------------------------------------------------------------------------
// Build B: nationality, height, career clubs, managers and grounds
// ---------------------------------------------------------------------------

/** A head coach's stay at a club. */
export type ManagerStay = { club: number; qid: string; name: string; started: string | null; ended: string | null };
/** A well-known player anywhere, for wrong options. */
export type FamousPlayer = { id: number; name: string; fame: number; nationality: string | null };
/** A club's ground now. */
export type Ground = { club: number; name: string; capacity: number };

/** Nigeria first when it fits (Nigeria-first, Collins), then the rest by the seed. */
const NIGERIA = "Nigeria";
function nationsFirst(nations: string[], seed: number): string[] {
  const rest = rotate(nations.filter((n) => n !== NIGERIA).sort(), seed);
  return nations.includes(NIGERIA) ? [NIGERIA, ...rest] : rest;
}

/** Each player once, with what we know of them. */
const uniquePlayers = (spells: ClubSpell[]) => [...new Map(spells.map((s) => [s.id, s])).values()];

/** Part 1 #2: the players from one country who've played for the club since 1992, a list of fair length. */
export function nationAtClub(spells: ClubSpell[], seed: number): { nation: string; players: SharedPlayer[] } | null {
  const byNation = new Map<string, ClubSpell[]>();
  for (const p of uniquePlayers(spells.filter((s) => (s.left ?? "9999") >= "1992-08-15")))
    if (p.nationality) byNation.set(p.nationality, [...(byNation.get(p.nationality) ?? []), p]);
  const fits = [...byNation].filter(([, ps]) => ps.length >= MIN_SHARED && ps.length <= MAX_SHARED).map(([n]) => n);
  const nation = nationsFirst(fits, seed)[0];
  if (!nation) return null;
  return { nation, players: byNation.get(nation)!.map((p) => ({ id: p.id, name: p.name, aliases: p.aliases, joinedA: p.joined, joinedB: null, fame: p.fame })) };
}

/** Permanent stays since 1992: 120 days or more, so caretakers are left out. */
export function permanentManagers(stays: ManagerStay[], club: number, today: string): ManagerStay[] {
  return stays
    .filter((m) => m.club === club && m.started && (m.ended ?? today) >= "1992-08-15")
    .filter((m) => (Date.parse(m.ended ?? today) - Date.parse(m.started!)) / 86_400_000 >= 120)
    .sort((a, b) => (a.started! < b.started! ? -1 : 1));
}

/** Part 1 #5: every permanent manager of the club since 1992. */
export function managersOf(stays: ManagerStay[], club: number, today: string): SharedPlayer[] | null {
  const names = [...new Map(permanentManagers(stays, club, today).map((m) => [m.qid, m])).values()];
  return names.length >= MIN_SHARED && names.length <= MAX_SHARED
    ? names.map((m, i) => ({ id: -(i + 1), name: m.name, aliases: [], joinedA: m.started, joinedB: null }))
    : null;
}

/** Wrong options for a round: names not taken yet, best known first. */
function picker(names: string[]) {
  const seen = new Set<string>();
  return {
    seen,
    take(n: number): string[] {
      const out: string[] = [];
      for (const name of names) {
        if (out.length === n) break;
        const k = normalizeName(name);
        if (k && !seen.has(k)) {
          seen.add(k);
          out.push(name);
        }
      }
      return out;
    },
  };
}

/** Builds a Rapid round from right answers and a pool of wrong ones. */
function rapidRound(right: string[], wrong: string[]): PickLine[] {
  const pool = picker(wrong);
  const lines: PickLine[] = [];
  for (const answer of right) {
    if (lines.length === PICK_SIZE) break;
    const k = normalizeName(answer);
    if (!k || pool.seen.has(k)) continue;
    pool.seen.add(k);
    const w = pool.take(3);
    if (w.length < 3) break;
    lines.push({ question: null, answer, wrong: w });
  }
  return lines.length >= MIN_PICKS && !pickIssues(lines, "pick").errors.length ? lines : [];
}

/**
 * Part 1 Rapid #2: one player from a country who's played for either club,
 * three from the same country who never did.
 */
export function nationPicks(spells: ClubSpell[], famous: FamousPlayer[], recent: Set<string>, seed: number): { nation: string; lines: PickLine[] } | null {
  const here = new Set(spells.map((s) => s.id));
  const players = uniquePlayers(spells.filter((s) => (s.left ?? "9999") >= "1992-08-15" && s.nationality)).sort(byFame);
  const nations = nationsFirst([...new Set(players.map((p) => p.nationality!))], seed);
  for (const nation of nations) {
    const right = players.filter((p) => p.nationality === nation && !recent.has(normalizeName(p.name))).slice(0, KNOWN_POOL).map((p) => p.name);
    const wrong = famous.filter((f) => f.nationality === nation && !here.has(f.id)).sort(byFame).slice(0, KNOWN_POOL * 2).map((f) => f.name);
    const lines = rapidRound(rotate(right, seed), rotate(wrong, seed));
    if (lines.length) return { nation, lines };
  }
  return null;
}

/** Part 1 Rapid #6: one manager of either club since 1992, three who managed other clubs we track but never these. */
export function managerPicks(stays: ManagerStay[], dayClubs: Club[], seed: number, today: string): PickLine[] {
  const ours = new Set(dayClubs.map((c) => c.id));
  const theirs = new Set(stays.filter((m) => ours.has(m.club)).map((m) => m.qid));
  const right = [...new Set(dayClubs.flatMap((c) => permanentManagers(stays, c.id, today)).map((m) => m.name))];
  const others = [...new Set(stays.filter((m) => !theirs.has(m.qid) && (m.ended ?? today) >= "1992-08-15").map((m) => m.name))];
  return rapidRound(rotate(right, seed), rotate(others, seed));
}

/** Five values spread apart by at least `gap`, best known first; null if there aren't five. */
function spreadFive<T>(items: T[], value: (x: T) => number | null | undefined, gap: number): T[] | null {
  const out: T[] = [];
  for (const x of items) {
    const v = value(x);
    if (v === null || v === undefined) continue;
    if (out.every((o) => Math.abs(value(o)! - v) >= gap)) out.push(x);
    if (out.length === ORDER_SIZE) break;
  }
  return out.length === ORDER_SIZE ? out : null;
}

/** Part 2 #3: five of the club's best known by how many clubs they've played for, most first, two or more apart. */
export function mostClubs(spells: ClubSpell[], careers: Map<number, CareerSpell[]>, recent: Set<string>, seed: number): OrderLine[] {
  // Wikidata misses clubs now and then: never fewer than the clubs we track him at.
  const clubsOf = (p: ClubSpell) => Math.max(p.careerClubs ?? 0, new Set((careers.get(p.id) ?? []).map((s) => s.club)).size) || null;
  const pool = rotate(uniquePlayers(spells).filter((p) => !recent.has(normalizeName(p.name))).sort(byFame).slice(0, KNOWN_POOL * 2), seed);
  const five = spreadFive(pool, clubsOf, 2);
  return five ? five.sort((a, b) => clubsOf(b)! - clubsOf(a)!).map((p) => ({ text: p.name, note: clubsOf(p) === 1 ? "1 club" : `${clubsOf(p)} clubs` })) : [];
}

/** Part 2 #6: five of the club's best known by height, tallest first, three centimetres or more apart. */
export function tallestFirst(spells: ClubSpell[], recent: Set<string>, seed: number): OrderLine[] {
  const pool = rotate(uniquePlayers(spells).filter((p) => !recent.has(normalizeName(p.name))).sort(byFame).slice(0, KNOWN_POOL * 2), seed);
  const five = spreadFive(pool, (p) => p.heightCm, 3);
  return five ? five.sort((a, b) => b.heightCm! - a.heightCm!).map((p) => ({ text: p.name, note: `${p.heightCm} cm` })) : [];
}

/** Part 2 #5: five of the club's permanent managers since 1992, in the order they were appointed. */
export function managersInOrder(stays: ManagerStay[], club: number, seed: number, today: string): OrderLine[] {
  const firsts = [...new Map(permanentManagers(stays, club, today).map((m) => [m.qid, m])).values()];
  const byYear = new Map<number, ManagerStay>();
  for (const m of firsts) if (!byYear.has(year(m.started)!)) byYear.set(year(m.started)!, m);
  const all = [...byYear.values()];
  if (all.length < ORDER_SIZE) return [];
  // A window of five in a row, so the order is about this club's history, moved along by the seed.
  const start = seed % (all.length - ORDER_SIZE + 1);
  return all.slice(start, start + ORDER_SIZE).map((m) => ({ text: m.name, note: String(year(m.started)) }));
}

/** Part 2 #11: the grounds of the day's clubs and three more we track, by capacity, biggest first, 2,000 or more apart. */
export function biggestGround(grounds: Ground[], dayClubs: Club[], seed: number): OrderLine[] {
  const ours = new Set(dayClubs.map((c) => c.id));
  const theirs = grounds.filter((g) => ours.has(g.club));
  const pool = [...theirs, ...rotate(grounds.filter((g) => !ours.has(g.club)), seed)];
  const five = spreadFive(pool, (g) => g.capacity, 2000);
  if (!five || theirs.some((g) => !five.includes(g))) return [];
  return five.sort((a, b) => b.capacity - a.capacity).map((g) => ({ text: g.name, note: g.capacity.toLocaleString("en-GB") }));
}

/** Part 2 Era #2: a manager's reign at the day's clubs, "Arsène Wenger at Arsenal". */
export function managerReigns(stays: ManagerStay[], dayClubs: Club[], seed: number, nowYear: number, today: string): PickLine[] {
  const reigns = dayClubs.flatMap((club) =>
    permanentManagers(stays, club.id, today)
      .filter((m) => m.ended)
      .map((m) => ({ club, name: m.name, from: Math.max(1992, year(m.started)!), to: year(m.ended)! }))
      .filter((r) => r.to > r.from && r.to <= nowYear),
  );
  const lines: PickLine[] = [];
  const seen = new Set<string>();
  for (const [i, r] of rotate(reigns, seed).entries()) {
    if (lines.length === ERA_SIZE) break;
    if (seen.has(r.name)) continue;
    const wrong = eraDecoys(r.from, r.to, seed + i, nowYear);
    if (!wrong) continue;
    seen.add(r.name);
    lines.push({ question: `${r.name} at ${r.club.name}`, answer: `${r.from}–${r.to}`, wrong });
  }
  return lines.length >= MIN_ERAS && !pickIssues(lines, "era").errors.length ? lines : [];
}
