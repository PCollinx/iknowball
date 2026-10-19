import { describe, expect, it } from "vitest";
import { fanbaseTable, weekTable, type WeekPart } from "./week";

const MON = "2026-10-12";
const day = (n: number) => `2026-10-${String(12 + n).padStart(2, "0")}`;
// A full-marks part 1 (60) or part 2 (40) on a given day.
const part = (userId: string, d: number, p: 1 | 2, correct: number, seconds = 60): WeekPart => ({
  userId,
  playDate: day(d),
  part: p,
  correct,
  answerCount: 10,
  seconds,
});

describe("weekTable", () => {
  it("adds both parts into a day and counts the best five days", () => {
    const parts = [0, 1, 2, 3, 4, 5, 6].flatMap((d) => [part("a", d, 1, d + 4), part("a", d, 2, 10)]);
    const [row] = weekTable(parts, MON);
    // Day scores: 60 * (d+4)/10 + 40, capped at 100 on day 6.
    expect(row.days).toEqual([64, 70, 76, 82, 88, 94, 100]);
    expect(row.counted).toEqual([2, 3, 4, 5, 6]);
    expect(row.points).toBe(76 + 82 + 88 + 94 + 100);
  });

  it("leaves days not played as null and counts fewer than five", () => {
    const [row] = weekTable([part("a", 0, 1, 10), part("a", 3, 2, 5)], MON);
    expect(row.days).toEqual([60, null, null, 20, null, null, null]);
    expect(row.points).toBe(80);
  });

  it("ignores parts from outside the week", () => {
    expect(weekTable([{ ...part("a", 0, 1, 10), playDate: "2026-10-11" }], MON)).toEqual([]);
  });

  it("breaks ties on time used on counted days, and shares a level place", () => {
    const rows = weekTable(
      [part("slow", 0, 1, 10, 90), part("fast", 0, 1, 10, 30), part("twin", 0, 1, 10, 30), part("low", 0, 1, 5)],
      MON,
    );
    expect(rows.map((r) => [r.userId, r.position])).toEqual([
      ["fast", 1],
      ["twin", 1],
      ["slow", 3],
      ["low", 4],
    ]);
  });

  it("drops the slower of two level days when choosing the counted five", () => {
    const parts = [0, 1, 2, 3, 4, 5].map((d) => part("a", d, 1, 10, d === 2 ? 200 : 50));
    const [row] = weekTable(parts, MON);
    expect(row.counted).toEqual([0, 1, 3, 4, 5]);
    expect(row.seconds).toBe(250);
  });
});

describe("fanbaseTable", () => {
  it("ranks clubs with enough fans by their average week", () => {
    const rows = [
      { points: 400, clubId: 1 },
      { points: 200, clubId: 1 },
      { points: 350, clubId: 2 },
      { points: 330, clubId: 2 },
      { points: 500, clubId: 3 },
      { points: 100, clubId: null },
    ];
    expect(fanbaseTable(rows, 2)).toEqual([
      { clubId: 2, fans: 2, average: 340, position: 1 },
      { clubId: 1, fans: 2, average: 300, position: 2 },
    ]);
  });
});

describe("weekTable with Clash", () => {
  it("adds the best 3 sprints, capped at 100", () => {
    const sprints = [12, 30, 25, 40, 5].map((right) => ({ userId: "a", right }));
    const [row] = weekTable([part("a", 0, 1, 10)], MON, sprints);
    expect(row.clash).toBe(95);
    expect(row.points).toBe(60 + 95);
    const [capped] = weekTable([], MON, [40, 40, 40].map((right) => ({ userId: "b", right })));
    expect(capped.clash).toBe(100);
  });

  it("puts a sprint-only player on the table", () => {
    const rows = weekTable([part("a", 0, 1, 1)], MON, [{ userId: "b", right: 20 }]);
    expect(rows.map((r) => [r.userId, r.points])).toEqual([["b", 20], ["a", 6]]);
    expect(rows[0].days).toEqual(Array(7).fill(null));
  });
});
