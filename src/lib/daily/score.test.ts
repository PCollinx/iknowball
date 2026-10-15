import { describe, expect, it } from "vitest";
import { partScore, seededShuffle, topPercent } from "./score";

describe("partScore", () => {
  it("scores correct answers per format", () => {
    expect(partScore("free_recall", 12)).toBe(480);
    expect(partScore("in_order", 4)).toBe(120);
    expect(partScore("in_order", -1)).toBe(0);
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
