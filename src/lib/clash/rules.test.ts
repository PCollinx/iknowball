import { describe, expect, it } from "vitest";
import { afterAnswer, buildChain, isRight, newCode, statOfDay } from "./rules";

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
