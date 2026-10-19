import { describe, expect, it } from "vitest";
import { partScore, rankTable, seededShuffle, topPercent } from "./score";

describe("partScore", () => {
  it("scores a part by its share of answers right", () => {
    expect(partScore(1, 12, 12)).toBe(60);
    expect(partScore(1, 5, 10)).toBe(30);
    expect(partScore(2, 4, 6)).toBe(27);
    expect(partScore(2, -1, 6)).toBe(0);
    expect(partScore(2, 9, 6)).toBe(40);
    expect(partScore(1, 0, 0)).toBe(0);
  });
});

describe("topPercent", () => {
  it("ranks a score among today's", () => {
    expect(topPercent(600, [600, 400, 300, 200])).toBe(25);
    expect(topPercent(200, [600, 400, 300, 200])).toBe(100);
    expect(topPercent(500, [500])).toBeNull();
  });
});

describe("seededShuffle", () => {
  const items = [1, 2, 3, 4, 5, 6].map((id) => ({ id }));
  it("is stable for the same seed and keeps every item", () => {
    const a = seededShuffle(items, 42).map((x) => x.id);
    expect(seededShuffle(items, 42).map((x) => x.id)).toEqual(a);
    expect([...a].sort()).toEqual([1, 2, 3, 4, 5, 6]);
  });
  it("never returns the items already in order", () => {
    for (let seed = 0; seed < 200; seed++) {
      expect(seededShuffle(items, seed).map((x) => x.id)).not.toEqual([1, 2, 3, 4, 5, 6]);
    }
  });
});

describe("rankTable", () => {
  it("ranks by score, then less time, and shares positions on a dead heat", () => {
    const table = rankTable([
      { userId: "a", score: 70, seconds: 90 },
      { userId: "b", score: 85, seconds: 120 },
      { userId: "c", score: 70, seconds: 60 },
      { userId: "d", score: 70, seconds: 90 },
    ]);
    expect(table.map((e) => `${e.userId}${e.position}`)).toEqual(["b1", "c2", "a3", "d3"]);
  });
});
