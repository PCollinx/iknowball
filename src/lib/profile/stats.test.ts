import { describe, expect, it } from "vitest";
import { bestFive, dayScores, streak, tierFor } from "./stats";

describe("tierFor", () => {
  it("uses the beta cut-offs", () => {
    expect(tierFor(899)).toBe("Plastic");
    expect(tierFor(900)).toBe("Casual");
    expect(tierFor(1000)).toBe("Casual");
    expect(tierFor(1100)).toBe("Supporter");
    expect(tierFor(1300)).toBe("Ball Knower");
    expect(tierFor(1500)).toBe("Pundit");
    expect(tierFor(1750)).toBe("Ball God");
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
