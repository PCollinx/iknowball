import { describe, expect, it } from "vitest";
import { draftDay, type TemplateData } from "./day";
import {
  clubScorers,
  dayLabel,
  keyPassesOrder,
  lastTimeTheyMet,
  matchRatings,
  scoredInMatch,
  seasonGoals,
  startersThisSeason,
  superEaglesNow,
  tableOrder,
  type MatchData,
  type MatchLine,
  type PlayedMatch,
} from "./matchday";

// A made-up season: club 1 (Arsenal) and 2 (Chelsea) play clubs 3 to 8, each
// side fielding players club * 100 + 1 to + 12. Player 101 scores in every
// Arsenal match, 201 in every Chelsea one.
const ARS = 1;
const CHE = 2;
const clubName = new Map(Array.from({ length: 20 }, (_, i) => [i + 1, ["Arsenal", "Chelsea", "Spurs", "Fulham", "Everton", "Wolves", "Leeds", "Burnley"][i] ?? `Club ${i + 1}`]));
const side = (club: number, date: string, scorer: number | null, goals = 1): MatchLine[] =>
  Array.from({ length: 12 }, (_, i) => {
    const player = club * 100 + i + 1;
    return {
      player,
      club,
      started: i < 11,
      minutes: i < 11 ? 90 : 0,
      rating: i < 11 ? 6 + i * 0.35 : null,
      keyPasses: (i + Number(date.slice(-2))) % 6,
      goals: player === scorer ? goals : 0,
      position: i === 0 ? "GK" : i < 5 ? "DEF" : "MID",
    };
  });
const match = (date: string, home: number, away: number, hg: number, ag: number, scorers: number[]): PlayedMatch => ({
  date,
  home,
  away,
  homeGoals: hg,
  awayGoals: ag,
  goals: scorers.map((p) => ({ player: p, club: Math.floor(p / 100), ownGoal: false })),
  lines: [...side(home, date, scorers.find((p) => Math.floor(p / 100) === home) ?? null), ...side(away, date, scorers.find((p) => Math.floor(p / 100) === away) ?? null)],
});
const matches: PlayedMatch[] = [3, 4, 5, 6, 7, 8]
  .flatMap((o, i) => {
    const day = String(10 + i).padStart(2, "0");
    return [match(`2026-10-${day}`, ARS, o, 1, 0, [101]), match(`2026-10-${day}`, CHE, o === 8 ? 3 : o + 1, 1, 1, [201, (o === 8 ? 3 : o + 1) * 100 + 9])];
  })
  .sort((a, b) => b.date.localeCompare(a.date));
// Varied goal totals, so a season goals round can be five apart.
for (const [n, p] of [[2, 301], [3, 401], [4, 501]] as const) for (const m of matches.slice(0, n)) m.lines.push({ player: p, club: Math.floor(p / 100), started: true, minutes: 90, rating: 7, keyPasses: 1, goals: 1, position: "FWD" });

const players = new Map<number, { name: string; fame: number; nationality: string | null }>();
for (const club of [1, 2, 3, 4, 5, 6, 7, 8]) for (let i = 1; i <= 12; i++) players.set(club * 100 + i, { name: `${clubName.get(club)} Player${i}`, fame: 100 - i, nationality: i <= 6 ? "Nigeria" : "England" });

const data: MatchData = {
  asOf: "2026-10-30",
  // A table of 20, Arsenal 2nd and Chelsea 5th.
  table: Array.from({ length: 20 }, (_, i) => ({ club: i + 1, position: [2, 5, 1, 3, 4, ...Array.from({ length: 15 }, (_, k) => k + 6)][i], points: 40 - i, played: 6 })),
  matches,
  seasonComplete: true,
  meetings: [
    { date: "2025-04-01", home: ARS, away: CHE, homeGoals: 2, awayGoals: 1, goals: [{ player: 101, club: ARS, ownGoal: false }, { player: 205, club: CHE, ownGoal: false }], lines: [] },
    { date: "2024-10-01", home: CHE, away: ARS, homeGoals: 1, awayGoals: 0, goals: [{ player: 206, club: CHE, ownGoal: false }], lines: [] },
    { date: "2024-04-01", home: ARS, away: CHE, homeGoals: 0, awayGoals: 0, goals: [], lines: [] },
    { date: "2023-10-01", home: CHE, away: ARS, homeGoals: 0, awayGoals: 1, goals: [{ player: 107, club: ARS, ownGoal: false }], lines: [] },
    { date: "2023-04-01", home: ARS, away: CHE, homeGoals: 1, awayGoals: 1, goals: [{ player: 108, club: ARS, ownGoal: false }, { player: 999, club: CHE, ownGoal: true }], lines: [] },
    { date: "2022-10-01", home: CHE, away: ARS, homeGoals: 3, awayGoals: 0, goals: [{ player: 210, club: CHE, ownGoal: false }], lines: [] },
  ],
  players,
  clubName,
  spellsAt: new Map(
    [ARS, CHE].map((c) => [c, Array.from({ length: 12 }, (_, i) => ({ id: c * 100 + i + 1, name: players.get(c * 100 + i + 1)!.name, fame: 100 - i, joined: "2020-07-01", left: null }))]),
  ),
};

describe("build D templates", () => {
  it("names this season's Nigerians, starters and scorers", () => {
    expect(superEaglesNow(data)).toBeNull(); // 48 of them: more than Free Recall takes
    expect(startersThisSeason(data, ARS)!.map((p) => p.id).sort()).toEqual([101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111]);
    expect(clubScorers(data, ARS)).toBeNull(); // one scorer: too few
  });

  it("waits for the whole season before asking season-wide questions", () => {
    const partial = { ...data, seasonComplete: false };
    expect(startersThisSeason(partial, ARS)).toBeNull();
    expect(seasonGoals(partial, [ARS, CHE], 0)).toEqual([]);
    expect(tableOrder(partial, [ARS, CHE], 1)).not.toEqual([]); // the table is always whole
  });

  it("asks who scored in the day's clubs' matches, newest first", () => {
    const lines = scoredInMatch(data, [ARS, CHE], 0);
    expect(lines.length).toBeGreaterThanOrEqual(5);
    expect(lines[0].question).toBe("Arsenal 1–0 Burnley · Thu 15 Oct");
    expect(lines[0].answer).toBe("Arsenal Player1");
    for (const l of lines) expect(l.wrong).not.toContain(l.answer);
  });

  it("asks who scored in the pair's meetings, wrong options from either club then, never an own goal", () => {
    const lines = lastTimeTheyMet(data, 0);
    expect(lines).toHaveLength(5);
    expect(lines[0].question).toBe("Arsenal 2–1 Chelsea · Apr 2025");
    expect(lines[0].wrong).not.toContain("Chelsea Player5");
    expect(lines.some((l) => l.question!.includes("0–0"))).toBe(false);
  });

  it("orders the table with both of the day's clubs, two places apart", () => {
    const lines = tableOrder(data, [ARS, CHE], 1);
    expect(lines.map((l) => l.text)).toEqual(expect.arrayContaining(["Arsenal", "Chelsea"]));
    expect(lines[0].note).toMatch(/^\d+(st|nd|rd|th) · \d+ pts$/);
    expect(tableOrder({ ...data, table: data.table.map((t) => ({ ...t, played: 2 })) }, [ARS, CHE], 1)).toEqual([]);
  });

  it("orders season goals with one of the day's clubs' scorers", () => {
    const lines = seasonGoals(data, [ARS, CHE], 0);
    expect(lines.map((l) => l.text)).toContain("Arsenal Player1");
    expect(lines.map((l) => l.note)).toEqual(["6 goals", "4 goals", "3 goals", "2 goals", "1 goal"].filter((n) => lines.some((l) => l.note === n)));
  });

  it("orders key passes in the latest matchweek, a key pass or more each", () => {
    const found = keyPassesOrder(data, [ARS, CHE], (d) => d.slice(0, 8), 0)!;
    expect(found.lines).toHaveLength(5);
    for (const l of found.lines) expect(l.note).toMatch(/^[1-9]\d* key pass(es)?$/);
  });

  it("orders a club's starters in its latest match by rating", () => {
    const found = matchRatings(data, ARS)!;
    expect(found.match.date).toBe("2026-10-15");
    const ratings = found.lines.map((l) => Number(l.note));
    expect(ratings).toEqual([...ratings].sort((a, b) => b - a));
  });

  it("labels dates the way the Daily prints them", () => {
    expect(dayLabel("2026-11-01")).toBe("Sun 1 Nov");
  });

  it("drafts matchday parts, marked as from the match data", () => {
    const more: TemplateData = { clubs: new Map(), spellsAt: new Map(), careers: new Map(), recentTemplates: new Set(), managers: [], famous: [], grounds: [], matchday: data };
    const shared = ["Ade Bolt", "Ben Cole", "Cal Dunn", "Dan Eze", "Eli Fox", "Fin Gray"].map((name, i) => ({ id: i + 1, name, aliases: [], joinedA: null, joinedB: null }));
    const templates = new Set(
      Array.from({ length: 40 }, (_, i) => draftDay(`2026-11-${String((i % 28) + 1).padStart(2, "0")}`, { id: ARS, name: "Arsenal" }, { id: CHE, name: "Chelsea" }, shared, new Set(), { decoys: [], spells: new Map(), nowYear: 2026 }, more))
        .flatMap((d) => [d.part1, d.part2])
        .filter((p) => p?.source?.includes("Highlightly"))
        .map((p) => p!.template),
    );
    expect(templates).toEqual(new Set(["starters-this-season", "scored-in-match", "last-time-they-met", "table-order", "season-goals", "key-passes", "match-rating"]));
  });
});
