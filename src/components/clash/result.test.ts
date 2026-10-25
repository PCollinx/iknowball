import { describe, expect, it } from "vitest";
import type { Result } from "@/lib/clash/data";
import { calledLine, fitSlots, outcomeLabel, outcomeOf, slots, toBeat, verdict, verdictLine } from "./result";

const row = (name: string, right: number, extra: Partial<Result> = {}): Result => ({ name, right, bestRun: 0, kicks: "", mine: false, setter: false, ...extra });

describe("the challenge's verdict", () => {
  it("names a win, a draw and a loss", () => {
    expect(outcomeLabel(outcomeOf(16, 14))).toBe("Won by 2");
    expect(outcomeLabel(outcomeOf(14, 14))).toBe("Level");
    expect(outcomeLabel(outcomeOf(11, 14))).toBe("Lost by 3");
  });

  it("puts the sash on the last word", () => {
    const tunde = { name: "tunde", right: 14 };
    expect(verdict(tunde, outcomeOf(16, 14))).toEqual(["tunde's 14", "beaten"]);
    expect(verdict(tunde, outcomeOf(14, 14))).toEqual(["Level with tunde's", "14"]);
    expect(verdict(tunde, outcomeOf(12, 14))).toEqual(["2 short of tunde's", "14"]);
    expect(verdictLine(tunde, outcomeOf(16, 14))).toBe("tunde's 14 is beaten.");
    expect(verdictLine(tunde, outcomeOf(12, 14))).toBe("2 short of tunde's 14.");
  });
});

describe("the album page", () => {
  it("fills a slot per call and leaves the rest empty", () => {
    expect(slots("101", 5)).toEqual(["1", "0", "1", null, null]);
  });

  it("says how far you got", () => {
    expect(calledLine(22, 40)).toBe("22 called before the whistle");
    expect(calledLine(39, 40)).toBe("Every call made before the whistle");
  });

  it("fits the slots to the space, as big as they go", () => {
    expect(fitSlots(22, 920, 390, 6, 120)).toEqual({ cols: 8, slot: (920 - 42) / 8 });
    expect(fitSlots(13, 920, 390, 6, 120)).toEqual({ cols: 7, slot: (920 - 36) / 7 });
    expect(fitSlots(3, 920, 390, 6, 120).slot).toBe(120);
  });
});

describe("the score to beat", () => {
  it("is yours when you top the table", () => {
    expect(toBeat([row("You", 16, { mine: true }), row("tunde", 14)], 16)).toEqual({ right: 16, name: "You" });
  });

  it("is the leader's when someone beat you", () => {
    expect(toBeat([row("chioma", 19), row("You", 16, { mine: true })], 16)).toEqual({ right: 19, name: "chioma" });
  });

  it("is yours before anyone else has played", () => {
    expect(toBeat([], 17)).toEqual({ right: 17, name: "You" });
  });
});
