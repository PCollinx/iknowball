import { seasonOfDate, type Captain, type FamousResult, type GoldenBoot, type Moment, type Standing } from "@/lib/curated/lists";
import { pickIssues, type OrderLine, type PickLine } from "@/lib/maker/parse";
import { seasonLabel, seasonOf } from "@/lib/time";
import { eraDecoys, ERA_SIZE, MAX_SHARED, MIN_ERAS, MIN_PICKS, MIN_SHARED, ORDER_SIZE, PICK_SIZE, type SharedPlayer } from "./generate";
import { rotate } from "./templates";

// Template build C (Collins, 30 Oct 2026): the templates answered from the
// lists kept by hand in the maker (src/lib/curated/lists.ts). Pure, like
// templates.ts: each returns its answers, or nothing when the lists can't make
// a fair round, and the draft tries the next template. Clubs are matched by
// name. Every round but Golden Boot winners needs one of the day's clubs in it.

const startOf = (season: string) => Number(season.slice(0, 4));
const ordinal = (n: number) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? "th" : (["th", "st", "nd", "rd"][n % 10] ?? "th")}`;
/** Seasons finished by this date: 2025/26 and before on 30 Oct 2026. */
const finished = (season: string, today: string) => startOf(season) < seasonOf(today);

/** The day's clubs' rows first (rotated), then the rest (rotated), so a round leads with today's fixture. */
function oursFirst<T>(rows: T[], ours: (row: T) => boolean, seed: number): T[] {
  return [...rotate(rows.filter(ours), seed), ...rotate(rows.filter((r) => !ours(r)), seed)];
}

/** Three wrong seasons near the right one, inside the Premier League era and finished, none of `avoid`. */
export function seasonDecoys(season: string, avoid: Set<string>, seed: number, today: string): string[] | null {
  const start = startOf(season);
  const near = [1, -1, 2, -2, 3, -3, 4, -4, 5, -5]
    .map((o) => seasonLabel(start + o))
    .filter((s) => startOf(s) >= 1992 && finished(s, today) && !avoid.has(s) && s !== season)
    .slice(0, 5);
  return near.length >= 3 ? rotate(near, seed).slice(0, 3) : null;
}

/** Each title in a club's run, "Man United's 7th title", or "Leicester's title" for an only one. */
const countLabel = <T>(rows: T[], key: (r: T) => string, when: (r: T) => string, noun: string) => {
  const all = new Map<string, string[]>();
  for (const r of rows) all.set(key(r), [...(all.get(key(r)) ?? []), when(r)].sort());
  return (r: T) => {
    const list = all.get(key(r))!;
    return list.length > 1 ? `${key(r)}'s ${ordinal(list.indexOf(when(r)) + 1)} ${noun}` : `${key(r)}'s ${noun}`;
  };
};

/** Free Recall #9: every Golden Boot winner, from the first season that keeps the list to MAX_SHARED. */
export function goldenBootWinners(boots: GoldenBoot[], today: string): { since: string | null; players: SharedPlayer[] } | null {
  const done = boots.filter((b) => finished(b.season, today));
  const seasons = [...new Set(done.map((b) => b.season))].sort();
  for (const [i, since] of seasons.entries()) {
    const names = [...new Set(done.filter((b) => b.season >= since).map((b) => b.player))];
    if (names.length > MAX_SHARED) continue;
    if (names.length < MIN_SHARED) return null;
    return { since: i ? since : null, players: names.map((name, k) => ({ id: -(k + 1), name, aliases: [], joinedA: null, joinedB: null })) };
  }
  return null;
}

/** Free Recall #11: a club's captains since 1992 (one who held the armband on its first day counts). */
export function captainsOf(captains: Captain[], club: string): SharedPlayer[] | null {
  const names = [...new Set(captains.filter((c) => c.club === club && (c.to_year === null || c.to_year >= 1992)).map((c) => c.player))];
  return names.length >= MIN_SHARED && names.length <= MAX_SHARED
    ? names.map((name, k) => ({ id: -(k + 1), name, aliases: [], joinedA: null, joinedB: null }))
    : null;
}

/** Rapid #8: a season on screen, tap its Golden Boot winner. Seasons with one winner, no player more than twice. */
export function goldenBootPicks(boots: GoldenBoot[], dayClubs: string[], seed: number, today: string): PickLine[] {
  const done = boots.filter((b) => finished(b.season, today));
  const winners = (season: string) => done.filter((b) => b.season === season);
  const single = done.filter((b) => winners(b.season).length === 1);
  if (!single.some((b) => dayClubs.includes(b.club))) return [];
  const lines: PickLine[] = [];
  const times = new Map<string, number>();
  for (const b of oursFirst(single, (r) => dayClubs.includes(r.club), seed)) {
    if (lines.length === PICK_SIZE) break;
    if ((times.get(b.player) ?? 0) >= 2) continue;
    // Wrong options: other winners from the nearest seasons.
    const near = [...new Set([...done].sort((x, y) => Math.abs(startOf(x.season) - startOf(b.season)) - Math.abs(startOf(y.season) - startOf(b.season))).map((x) => x.player))]
      .filter((p) => p !== b.player)
      .slice(0, 6);
    if (near.length < 3) continue;
    times.set(b.player, (times.get(b.player) ?? 0) + 1);
    lines.push({ question: b.season, answer: b.player, wrong: rotate(near, seed + lines.length).slice(0, 3) });
  }
  lines.sort((x, y) => x.question!.localeCompare(y.question!));
  return lines.length >= MIN_PICKS && !pickIssues(lines, "pick").errors.length ? lines : [];
}

/** In Order #20: five clubs by where they finished, the day's clubs among them, from the latest full table. */
export function whereTheyFinished(standings: Standing[], dayClubs: string[], seed: number, today: string): { season: string; lines: OrderLine[] } | null {
  const seasons = [...new Set(standings.map((s) => s.season))].filter((s) => finished(s, today)).sort().reverse();
  for (const season of seasons) {
    const table = standings.filter((s) => s.season === season);
    if (table.length < 18) continue; // a season kept only for its champion
    const ours = table.filter((s) => dayClubs.includes(s.club));
    if (!ours.length) continue;
    const five: Standing[] = [];
    for (const s of [...ours, ...rotate(table.filter((t) => !ours.includes(t)), seed)]) {
      if (five.every((f) => Math.abs(f.position - s.position) >= 2)) five.push(s);
      if (five.length === ORDER_SIZE) break;
    }
    if (five.length < ORDER_SIZE || ours.some((o) => !five.includes(o))) continue;
    return {
      season,
      lines: five
        .sort((a, b) => a.position - b.position)
        .map((s) => ({ text: s.club, note: s.points === null ? ordinal(s.position) : `${ordinal(s.position)} · ${s.points} pts` })),
    };
  }
  return null;
}

/** Era #4: when a club won the league, "Arsenal's 2nd title". */
export function titleSeasons(standings: Standing[], dayClubs: string[], seed: number, today: string): PickLine[] {
  const titles = standings.filter((s) => s.position === 1 && finished(s.season, today));
  if (!titles.some((t) => dayClubs.includes(t.club))) return [];
  const label = countLabel(titles, (t) => t.club, (t) => t.season, "title");
  const lines: PickLine[] = [];
  const per = new Map<string, number>();
  for (const [i, t] of oursFirst(titles, (r) => dayClubs.includes(r.club), seed).entries()) {
    if (lines.length === ERA_SIZE) break;
    if ((per.get(t.club) ?? 0) >= 3) continue;
    const wrong = seasonDecoys(t.season, new Set(titles.filter((x) => x.club === t.club).map((x) => x.season)), seed + i, today);
    if (!wrong) continue;
    per.set(t.club, (per.get(t.club) ?? 0) + 1);
    lines.push({ question: label(t), answer: t.season, wrong });
  }
  return lines.length >= MIN_ERAS && !pickIssues(lines, "era").errors.length ? lines : [];
}

/** Era #5: when a player won the Golden Boot, "Mohamed Salah's 2nd Golden Boot". */
export function goldenBootSeasons(boots: GoldenBoot[], dayClubs: string[], seed: number, today: string): PickLine[] {
  const done = boots.filter((b) => finished(b.season, today));
  if (!done.some((b) => dayClubs.includes(b.club))) return [];
  const label = countLabel(done, (b) => b.player, (b) => b.season, "Golden Boot");
  const lines: PickLine[] = [];
  const per = new Map<string, number>();
  for (const [i, b] of oursFirst(done, (r) => dayClubs.includes(r.club), seed).entries()) {
    if (lines.length === ERA_SIZE) break;
    if (per.has(b.player)) continue;
    const wrong = seasonDecoys(b.season, new Set(done.filter((x) => x.player === b.player).map((x) => x.season)), seed + i, today);
    if (!wrong) continue;
    per.set(b.player, 1);
    lines.push({ question: label(b), answer: b.season, wrong });
  }
  return lines.length >= MIN_ERAS && !pickIssues(lines, "era").errors.length ? lines : [];
}

/** Era #9: a captain's years with the armband at one of the day's clubs, appointed in the Premier League era. */
export function captainYears(captains: Captain[], dayClubs: string[], seed: number, nowYear: number): PickLine[] {
  const stints = captains.filter((c) => dayClubs.includes(c.club) && c.from_year >= 1992 && c.to_year !== null && c.to_year > c.from_year && c.to_year <= nowYear);
  const lines: PickLine[] = [];
  const seen = new Set<string>();
  for (const [i, c] of rotate(stints, seed).entries()) {
    if (lines.length === ERA_SIZE) break;
    if (seen.has(c.player)) continue;
    const wrong = eraDecoys(c.from_year, c.to_year!, seed + i, nowYear);
    if (!wrong) continue;
    seen.add(c.player);
    lines.push({ question: `${c.player} at ${c.club}`, answer: `${c.from_year}–${c.to_year}`, wrong });
  }
  return lines.length >= MIN_ERAS && !pickIssues(lines, "era").errors.length ? lines : [];
}

/** Era #11: the season of a famous result, the day's clubs' results first. */
export function resultSeasons(results: FamousResult[], dayClubs: string[], seed: number, today: string): PickLine[] {
  const ours = (r: FamousResult) => dayClubs.includes(r.home) || dayClubs.includes(r.away);
  if (!results.some(ours)) return [];
  const lines: PickLine[] = [];
  for (const [i, r] of oursFirst(results, ours, seed).entries()) {
    if (lines.length === ERA_SIZE) break;
    const season = seasonOfDate(r.played_on);
    const wrong = seasonDecoys(season, new Set(), seed + i, today);
    if (wrong) lines.push({ question: `${r.home} ${r.home_goals}–${r.away_goals} ${r.away}`, answer: season, wrong });
  }
  return lines.length >= MIN_ERAS && !pickIssues(lines, "era").errors.length ? lines : [];
}

/** Whole years between two dates. */
export function ageOn(born: string, on: string): number {
  const [by, bm, bd] = born.split("-").map(Number);
  const [y, m, d] = on.split("-").map(Number);
  return y - by - (m < bm || (m === bm && d < bd) ? 1 : 0);
}

/** Era #12: how old a player was at his debut or first goal, the day's clubs first. */
export function howOld(moments: Moment[], dayClubs: string[], seed: number): PickLine[] {
  if (!moments.some((m) => dayClubs.includes(m.club))) return [];
  const lines: PickLine[] = [];
  for (const [i, m] of oursFirst(moments, (r) => dayClubs.includes(r.club), seed).entries()) {
    if (lines.length === ERA_SIZE) break;
    const age = ageOn(m.born_on, m.happened_on);
    const wrong = rotate([age + 1, age - 1, age + 2, age - 2].filter((a) => a >= 14), seed + i).slice(0, 3).map(String);
    if (wrong.length < 3) continue;
    const what = m.moment === "debut" ? "PL debut" : "first PL goal";
    lines.push({ question: `${m.player}'s ${what} at ${m.club}`, answer: String(age), wrong });
  }
  return lines.length >= MIN_ERAS && !pickIssues(lines, "era").errors.length ? lines : [];
}
