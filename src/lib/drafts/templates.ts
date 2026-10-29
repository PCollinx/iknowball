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
