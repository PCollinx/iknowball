import { describe, expect, it } from "vitest";
import { dayIndex, formGuide, gapLine, splitPodium } from "./standing";

const row = (name: string, points: number, mine = false) => ({ name, points, mine });

describe("gapLine", () => {
  it("measures you against the leader", () => {
    expect(gapLine([row("tunde", 340), row("You", 312, true)])).toBe("28 behind tunde");
  });
  it("measures the leader against second", () => {
    expect(gapLine([row("You", 312, true), row("dad", 272)])).toBe("40 clear of dad");
  });
  it("says when it's level", () => {
    expect(gapLine([row("You", 300, true), row("dad", 300)])).toBe("Level with dad");
    expect(gapLine([row("tunde", 300), row("You", 300, true)])).toBe("Level with tunde");
  });
  it("tops a table nobody else has scored on", () => {
    expect(gapLine([row("You", 50, true), row("dad", 0)])).toBe("Top of the table");
    expect(gapLine([row("You", 50, true)])).toBe("Top of the table");
  });
  it("waits for you to play", () => {
    expect(gapLine([row("tunde", 340), row("You", 0, true)])).toBe("Not played this week");
    expect(gapLine([row("tunde", 340)])).toBe("Not played this week");
  });
});

describe("splitPodium", () => {
  it("puts the top three on the podium and the rest in the table", () => {
    const rows = [row("a", 9), row("b", 8), row("c", 7), row("d", 6)];
    expect(splitPodium(rows).podium.map((r) => r.name)).toEqual(["a", "b", "c"]);
    expect(splitPodium(rows).rest.map((r) => r.name)).toEqual(["d"]);
  });
  it("keeps players on 0 off the podium", () => {
    const rows = [row("a", 9), row("b", 0), row("c", 0)];
    expect(splitPodium(rows).podium.map((r) => r.name)).toEqual(["a"]);
    expect(splitPodium(rows).rest.map((r) => r.name)).toEqual(["b", "c"]);
  });
});

describe("dayIndex", () => {
  it("counts from Monday, across a month end", () => {
    expect(dayIndex("2026-10-26", "2026-10-26")).toBe(0);
    expect(dayIndex("2026-10-26", "2026-11-01")).toBe(6);
  });
});

describe("formGuide", () => {
  it("marks counted, dropped, missed and upcoming days", () => {
    const days = [55, 58, 60, 52, 49, 47, null];
    expect(formGuide(days, [0, 1, 2, 3, 4], 5).map((d) => d.kind)).toEqual(["counts", "counts", "counts", "counts", "counts", "dropped", "ahead"]);
    expect(formGuide([null, 70, null, null, null, null, null], [1], 2).map((d) => d.kind)).toEqual(["missed", "counts", "missed", "ahead", "ahead", "ahead", "ahead"]);
  });
});
