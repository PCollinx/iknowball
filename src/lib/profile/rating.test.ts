import { describe, expect, it } from "vitest";
import { formatRating, overallRating, RATING_DAYS, ratingColours, scoreInk } from "./rating";

const days = (scores: number[]) => new Map(scores.map((s, i) => [`2026-10-${String(i + 1).padStart(2, "0")}`, s]));

describe("overallRating", () => {
  it("is null before a first Daily", () => {
    expect(overallRating(new Map())).toBeNull();
  });

  it("is a day score over 10 for one day", () => {
    expect(overallRating(days([76]))).toBe(7.6);
    expect(overallRating(days([100]))).toBe(10);
  });

  it("counts the newest days most", () => {
    // Oldest first: a bad start then a good run rates above the plain average.
    const rising = overallRating(days([20, 40, 80, 90]))!;
    expect(rising).toBeGreaterThan(5.8);
    expect(overallRating(days([90, 80, 40, 20])) ?? 0).toBeLessThan(5.8);
  });

  it("only counts the last RATING_DAYS days played", () => {
    const old = Array(10).fill(0);
    expect(overallRating(days([...old, ...Array(RATING_DAYS).fill(90)]))).toBe(9);
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
  it("runs red, orange, yellow, green", () => {
    expect(ratingColours(4.9).fill).toBe("#D7263D");
    expect(ratingColours(5).fill).toBe("#EE7A1A");
    expect(ratingColours(6.5).fill).toBe("#F4C21B");
    expect(ratingColours(7).fill).toBe("#1E9A4C");
  });
});

describe("scoreInk", () => {
  it("colours a day score like the rating it would make", () => {
    expect(scoreInk(72)).toEqual({ ink: "#1E9A4C", edge: false });
    expect(scoreInk(66)).toEqual({ ink: "#F4C21B", edge: true });
    expect(scoreInk(50)).toEqual({ ink: "#EE7A1A", edge: false });
    expect(scoreInk(31)).toEqual({ ink: "#D7263D", edge: false });
  });
});
