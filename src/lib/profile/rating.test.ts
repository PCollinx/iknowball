import { describe, expect, it } from "vitest";
import { formatRating, overallRating, RATING_DAYS, ratingColours, scoreInk, TIERS } from "./rating";

const days = (scores: number[]) => new Map(scores.map((s, i) => [`2026-10-${String(i + 1).padStart(2, "0")}`, s]));

describe("overallRating", () => {
  it("is null before a first Daily", () => {
    expect(overallRating(new Map())).toBeNull();
  });

  it("reads a day score as 3 + 0.07 × score", () => {
    expect(overallRating(days([76]))).toBe(8.3);
    expect(overallRating(days([50]))).toBe(6.5);
    expect(overallRating(days([0]))).toBe(3);
    expect(overallRating(days([100]))).toBe(10);
  });

  it("counts the newest days most", () => {
    // Oldest first: a bad start then a good run rates above the plain average.
    const rising = overallRating(days([20, 40, 80, 90]))!;
    expect(rising).toBeGreaterThan(7);
    expect(overallRating(days([90, 80, 40, 20])) ?? 0).toBeLessThan(7);
  });

  it("only counts the last RATING_DAYS days played", () => {
    const old = Array(10).fill(0);
    expect(overallRating(days([...old, ...Array(RATING_DAYS).fill(90)]))).toBe(9.3);
  });
});

describe("formatRating", () => {
  it("shows one decimal, a bare 10 and a dash", () => {
    expect(formatRating(7)).toBe("7.0");
    expect(formatRating(8.9)).toBe("8.9");
    expect(formatRating(10)).toBe("10");
    expect(formatRating(null)).toBe("–");
  });
});

describe("ratingColours", () => {
  it("changes colour only where the tier changes", () => {
    expect(ratingColours(4.4).fill).toBe("#D7263D");
    expect(ratingColours(4.5).fill).toBe("#EE7A1A");
    expect(ratingColours(5.5).fill).toBe("#F4C21B");
    expect(ratingColours(6.5).fill).toBe("#1E9A4C");
    expect(ratingColours(7.5).fill).toBe("#0E6B35");
    expect(ratingColours(8.5).fill).toBe("#2440FF");
    for (const t of TIERS) if (Number.isFinite(t.from)) expect(ratingColours(t.from).fill).toBe(t.fill);
  });
});

describe("scoreInk", () => {
  it("colours a day score like the rating it would make", () => {
    expect(scoreInk(50)).toEqual({ ink: "#1E9A4C", edge: false });
    expect(scoreInk(49)).toEqual({ ink: "#F4C21B", edge: true });
    expect(scoreInk(35)).toEqual({ ink: "#F4C21B", edge: true });
    expect(scoreInk(21)).toEqual({ ink: "#EE7A1A", edge: false });
    expect(scoreInk(20)).toEqual({ ink: "#D7263D", edge: false });
  });
});
