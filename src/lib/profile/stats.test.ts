import { describe, expect, it } from "vitest";
import { bestFive, dayScores, nextTier, streak, tierFor } from "./stats";

describe("tierFor", () => {
  it("uses the beta cut-offs", () => {
    expect(tierFor(4.4)).toBe("Plastic");
    expect(tierFor(4.5)).toBe("Casual");
    expect(tierFor(5.4)).toBe("Casual");
    expect(tierFor(5.5)).toBe("Supporter");
    expect(tierFor(6.5)).toBe("Ball Knower");
    expect(tierFor(7.5)).toBe("Pundit");
    expect(tierFor(8.5)).toBe("Ball God");
    expect(tierFor(10)).toBe("Ball God");
  });
});

describe("dayScores", () => {
  it("weighs a day by share of answers right, 60 then 40", () => {
    const days = dayScores([
      { playDate: "2026-10-17", part: 1, correct: 17, answerCount: 17 },
      { playDate: "2026-10-17", part: 2, correct: 3, answerCount: 6 },
      { playDate: "2026-10-16", part: 1, correct: 5, answerCount: 10 },
    ]);
    expect(days.get("2026-10-17")).toBe(80);
    expect(days.get("2026-10-16")).toBe(30);
  });

  it("never goes past 100 a day", () => {
    const days = dayScores([
      { playDate: "2026-10-17", part: 1, correct: 20, answerCount: 17 },
      { playDate: "2026-10-17", part: 2, correct: 6, answerCount: 6 },
    ]);
    expect(days.get("2026-10-17")).toBe(100);
  });
});

describe("bestFive", () => {
  it("counts the best five days only", () => {
    expect(bestFive([10, 90, 50, 70, 30, 100, 20])).toBe(340);
    expect(bestFive([40, 60])).toBe(100);
  });
});

describe("streak", () => {
  it("counts back from today", () => {
    expect(streak(["2026-10-17", "2026-10-16", "2026-10-15", "2026-10-13"], "2026-10-17")).toBe(3);
  });

  it("keeps yesterday's streak until today is over", () => {
    expect(streak(["2026-10-16", "2026-10-15"], "2026-10-17")).toBe(2);
  });

  it("is zero after a missed day", () => {
    expect(streak(["2026-10-15"], "2026-10-17")).toBe(0);
  });
});

describe("nextTier", () => {
  it("gives the tier above, the gap and the way through this one", () => {
    expect(nextTier(7.6)).toEqual({ name: "Ball God", gap: 0.9, progress: expect.closeTo(0.1, 5) });
    expect(nextTier(5.5)).toEqual({ name: "Ball Knower", gap: 1, progress: 0 });
  });

  it("measures Plastic from the floor", () => {
    expect(nextTier(3.9)).toEqual({ name: "Casual", gap: 0.6, progress: expect.closeTo(0.6, 5) });
  });

  it("has nothing above Ball God", () => {
    expect(nextTier(8.6)).toBeNull();
  });
});
