import { describe, expect, it } from "vitest";
import type { Result } from "@/lib/clash/data";
import { calledLine, cardMessage, fitSlots, outcomeLabel, outcomeOf, resultCardData, slots, toBeat, verdict, verdictLine } from "./result";

const row = (name: string, right: number, extra: Partial<Result> = {}): Result => ({ name, right, bestRun: 0, kicks: "", mine: false, setter: false, ...extra });

describe("the challenge's verdict", () => {
  it("names a win, a draw and a loss", () => {
    expect(outcomeLabel(outcomeOf(16, 14))).toBe("Won by 2");
    expect(outcomeLabel(outcomeOf(14, 14))).toBe("Level");
    expect(outcomeLabel(outcomeOf(11, 14))).toBe("Lost by 3");
  });

  it("puts the sash on the last word", () => {
    const collinsCFC = { name: "collinsCFC", right: 14 };
    expect(verdict(collinsCFC, outcomeOf(16, 14))).toEqual(["collinsCFC's 14", "beaten"]);
    expect(verdict(collinsCFC, outcomeOf(14, 14))).toEqual(["Level with collinsCFC's", "14"]);
    expect(verdict(collinsCFC, outcomeOf(12, 14))).toEqual(["2 short of collinsCFC's", "14"]);
    expect(verdictLine(collinsCFC, outcomeOf(16, 14))).toBe("collinsCFC's 14 is beaten.");
    expect(verdictLine(collinsCFC, outcomeOf(12, 14))).toBe("2 short of collinsCFC's 14.");
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
    expect(toBeat([row("You", 16, { mine: true }), row("collinsCFC", 14)], 16)).toEqual({ right: 16, name: "You" });
  });

  it("is the leader's when someone beat you", () => {
    expect(toBeat([row("chioma", 19), row("You", 16, { mine: true })], 16)).toEqual({ right: 19, name: "chioma" });
  });

  it("is yours before anyone else has played", () => {
    expect(toBeat([], 17)).toEqual({ right: 17, name: "You" });
  });
});

describe("resultCardData", () => {
  const items = [
    { name: "Thierry Henry", club_id: 1, value: 14 },
    { name: "Alan Shearer", club_id: 2, value: 20 },
    { name: "Michael Owen", club_id: null, value: 8 },
    { name: "Sergio Agüero", club_id: 1, value: 30 },
    { name: "Frank Lampard", club_id: 2, value: 12 },
    { name: "Wayne Rooney", club_id: 2, value: 18 },
  ];
  const clubs = new Map([
    [1, { name: "Arsenal", kit: { shirt: "#EF0107", number: "#FFFFFF", trim: "#FFFFFF" } }],
    [2, { name: "Newcastle", kit: { shirt: "#241F20", number: "#FFFFFF", trim: "#FFFFFF" } }],
  ]);
  const base = { stat: "goals" as const, items, right: 14, name: "collinsCFC", toBeat: 14, clubs, code: "K7Q2XM", siteUrl: "https://playiknowball.com" };

  it("shows the run's first players, only the first one's number, and each call's mark", () => {
    const d = resultCardData({ ...base, kicks: "101111" });
    expect(d.chain.map((c) => [c.name, c.value, c.mark])).toEqual([
      ["Thierry Henry", 14, null],
      ["Alan Shearer", null, true],
      ["Michael Owen", null, false],
      ["Sergio Agüero", null, true],
      ["Frank Lampard", null, true],
    ]);
    expect(d.chain[2].club).toBeNull();
    expect(d.missed).toBe(1);
    expect(d.ask).toBe("Who has more league goals?");
    expect(d.link).toBe("playiknowball.com/clash/K7Q2XM");
  });

  it("only shows players the run reached, and leaves a guest's name off", () => {
    const d = resultCardData({ ...base, kicks: "1", name: "Guest AB12" });
    expect(d.chain).toHaveLength(2);
    expect(d.name).toBeNull();
  });

  it("writes the message without the link (the share button adds it)", () => {
    expect(cardMessage({ right: 14, missed: 5, toBeat: 14 })).toBe(
      "14 right, 5 missed in 60 seconds of Higher or Lower on iKnowBall. Same players, one go. Can you beat 14?",
    );
  });
});
