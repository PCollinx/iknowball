import { describe, expect, it } from "vitest";
import { fanSeasonTable, LAUNCH_WEEK, seasonStartsOn, seasonTable, seasonWeeks } from "./season";
import type { WeekRow } from "./week";

const row = (userId: string, points: number, position: number, seconds = 100): WeekRow => ({
  userId,
  days: Array(7).fill(null),
  counted: [],
  clash: 0,
  points,
  seconds,
  position,
});

describe("seasonStartsOn", () => {
  it("starts 2026/27 at launch week, earlier on test sites", () => {
    expect(seasonStartsOn(2026)).toBe(LAUNCH_WEEK);
    expect(seasonStartsOn(2026, true) < LAUNCH_WEEK).toBe(true);
  });

  it("starts later seasons on the first Monday of July", () => {
    expect(seasonStartsOn(2027)).toBe("2027-07-05"); // 1 July 2027 is a Thursday
    expect(seasonStartsOn(2030)).toBe("2030-07-01"); // a Monday itself
  });
});

describe("seasonWeeks", () => {
  it("numbers every week up to the one holding today", () => {
    const weeks = seasonWeeks("2026-11-16", "2026-12-02");
    expect(weeks.map((w) => w.n)).toEqual([1, 2, 3]);
    expect(weeks[2]).toEqual({ n: 3, startsOn: "2026-11-30", endsOn: "2026-12-06" });
  });

  it("is empty before the season starts", () => {
    expect(seasonWeeks("2026-11-16", "2026-11-09")).toEqual([]);
  });
});

describe("seasonTable", () => {
  it("adds up each week's points and counts weeks played and won", () => {
    const table = seasonTable([
      [row("a", 400, 1), row("b", 300, 2)],
      [row("b", 500, 1), row("a", 350, 2), row("c", 0, 3)],
    ]);
    expect(table).toEqual([
      { userId: "b", points: 800, played: 2, won: 1, seconds: 200, position: 1 },
      { userId: "a", points: 750, played: 2, won: 1, seconds: 200, position: 2 },
    ]);
  });

  it("breaks a level total on weeks won, then on time", () => {
    const table = seasonTable([
      [row("a", 300, 1), row("b", 200, 2, 50), row("c", 200, 2, 60)],
      [row("b", 300, 1, 50), row("c", 300, 1, 60), row("a", 200, 3)],
    ]);
    expect(table.map((r) => [r.userId, r.position])).toEqual([
      ["b", 1],
      ["c", 2],
      ["a", 3],
    ]);
  });
});

describe("fanSeasonTable", () => {
  const fan = (clubId: number, average: number, position: number) => ({ clubId, fans: 30, average, position });

  it("adds up each week's average for the weeks a club got through the gate", () => {
    const table = fanSeasonTable([[fan(1, 300, 1), fan(2, 250, 2)], [fan(2, 320, 1)]]);
    expect(table).toEqual([
      { clubId: 2, points: 570, played: 2, won: 1, position: 1 },
      { clubId: 1, points: 300, played: 1, won: 1, position: 2 },
    ]);
  });

  it("puts more weeks won higher when level, and shares a place when level on both", () => {
    const table = fanSeasonTable([[fan(1, 300, 1), fan(2, 200, 2), fan(3, 200, 3)], [fan(2, 300, 1), fan(3, 300, 2), fan(1, 200, 3)]]);
    expect(table.map((r) => [r.clubId, r.position])).toEqual([[1, 1], [2, 1], [3, 3]]);
  });

  it("is empty with no club through the gate", () => {
    expect(fanSeasonTable([[], []])).toEqual([]);
  });
});
