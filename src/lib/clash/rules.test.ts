import { describe, expect, it } from "vitest";
import { afterAnswer, afterSprint, buildChain, isRight, newCode, sprintLine, statOfDay, threeLine, threeTotal, yourThree } from "./rules";

describe("isRight", () => {
  it("checks more and fewer, and lets a tie through", () => {
    expect(isRight(100, 120, "more")).toBe(true);
    expect(isRight(100, 80, "more")).toBe(false);
    expect(isRight(100, 80, "fewer")).toBe(true);
    expect(isRight(100, 100, "fewer")).toBe(true);
    expect(isRight(100, 100, "level")).toBe(true);
    expect(isRight(100, 101, "level")).toBe(false);
  });
});

describe("buildChain", () => {
  const item = (name: string, value: number) => ({ name, club_id: 1, value });

  it("drops repeats and keeps to the size", () => {
    const chain = buildChain([item("A", 1), item("A", 1), item("B", 2), item("C", 3)], 2);
    expect(chain).toHaveLength(2);
    expect(new Set(chain.map((c) => c.name)).size).toBe(2);
  });

  it("avoids two neighbours with the same number when it can", () => {
    const pool = [item("A", 5), item("B", 5), item("C", 9), item("D", 5), item("E", 9)];
    for (let seed = 0; seed < 20; seed++) {
      let x = seed / 20;
      const chain = buildChain(pool, 5, () => (x = (x * 9301 + 0.49297) % 1));
      const ties = chain.slice(1).filter((c, i) => c.value === chain[i].value).length;
      expect(ties).toBeLessThanOrEqual(1);
    }
  });
});

describe("newCode", () => {
  it("is six characters with no 0, O, 1 or I", () => {
    for (let i = 0; i < 50; i++) expect(newCode()).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
  });
});

describe("afterAnswer", () => {
  it("counts runs and kicks", () => {
    let s = { answered: 0, right: 0, currentRun: 0, bestRun: 0, kicks: "" };
    for (const r of [true, true, false, true]) s = afterAnswer(s, r);
    expect(s).toEqual({ answered: 4, right: 3, currentRun: 1, bestRun: 2, kicks: "1101" });
  });
});

describe("buildChain gap", () => {
  const item = (name: string, value: number) => ({ name, club_id: 1, value });

  it("keeps neighbours the gap apart when the pool allows", () => {
    const pool = [item("A", 180), item("B", 181), item("C", 190), item("D", 182), item("E", 199), item("F", 170)];
    for (let seed = 0; seed < 20; seed++) {
      let x = seed / 20;
      const chain = buildChain(pool, 4, () => (x = (x * 9301 + 0.49297) % 1), 3);
      expect(chain.slice(1).every((c, i) => Math.abs(c.value - chain[i].value) >= 3)).toBe(true);
    }
  });
});

describe("statOfDay", () => {
  it("gives each weekday its stat, Monday first", () => {
    expect(statOfDay("2026-11-02")).toBe("goals");
    expect(statOfDay("2026-11-03")).toBe("apps");
    expect(statOfDay("2026-11-04")).toBe("height");
    expect(statOfDay("2026-11-05")).toBe("years");
    expect(statOfDay("2026-11-06")).toBe("clubs");
    expect(statOfDay("2026-11-07")).toBe("goals");
    expect(statOfDay("2026-11-08")).toBe("apps");
  });
});

describe("your three", () => {
  it("keeps the best three, highest first, and caps the total at 100", () => {
    expect(yourThree([9, 18, 4, 14])).toEqual([18, 14, 9]);
    expect(threeTotal([18, 14, 9])).toBe(41);
    expect(threeTotal([40, 38, 35])).toBe(100);
  });

  it("says what a sprint added and what it pushed out", () => {
    expect(afterSprint([18, 14, 9], 14)).toEqual({ three: [18, 14, 14], added: 5, replaced: 9 });
    expect(afterSprint([18, 14, 9], 7)).toEqual({ three: [18, 14, 9], added: 0, replaced: null });
    expect(afterSprint([12], 8)).toEqual({ three: [12, 8], added: 8, replaced: null });
    expect(afterSprint([40, 38, 30], 35).added).toBe(0);
  });

  it("words the line under the slots", () => {
    expect(threeLine([])).toBe("All three slots empty. Any score counts.");
    expect(threeLine([12])).toBe("2 slots empty. Any score counts.");
    expect(threeLine([12, 8])).toBe("1 slot empty. Any score counts.");
    expect(threeLine([18, 14, 9])).toBe("Beat 9 to add points.");
    expect(threeLine([40, 38, 30])).toBe("Full marks this week.");
  });
});

describe("sprintLine", () => {
  it("says what the sprint did to the week", () => {
    expect(sprintLine(14, afterSprint([18, 14, 9], 14))).toBe("+5 this week. Your 14 replaces your 9.");
    expect(sprintLine(12, afterSprint([], 12))).toBe("+12 this week. It fills a slot.");
    expect(sprintLine(7, afterSprint([18, 14, 9], 7))).toBe("Your three stay 18 · 14 · 9. Beat 9 next time.");
    expect(sprintLine(20, afterSprint([40, 38, 30], 20))).toBe("Full marks this week already.");
  });
});
