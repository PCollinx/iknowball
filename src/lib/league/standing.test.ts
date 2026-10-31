import { describe, expect, it } from "vitest";
import { dayIndex, formGuide, gapLine, splitPodium, teamOfTheWeek, yourSpot } from "./standing";

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
  it("points to Clash when it could take you past the player above", () => {
    const clash = (name: string, points: number, c: number, mine = false) => ({ name, points, mine, clash: c });
    expect(gapLine([clash("tunde", 480, 78), clash("You", 469, 41, true)])).toBe("Win 12 more on Clash to pass tunde");
    expect(gapLine([clash("ada", 520, 90), clash("tunde", 480, 78), clash("You", 469, 41, true)])).toBe("Win 12 more on Clash to pass tunde");
    expect(gapLine([clash("tunde", 480, 78), clash("You", 400, 41, true)])).toBe("80 behind tunde");
    expect(gapLine([clash("tunde", 480, 78), clash("You", 469, 95, true)])).toBe("11 behind tunde");
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

describe("teamOfTheWeek", () => {
  it("fills the team, then the bench, leaving players on 0 out", () => {
    const rows = Array.from({ length: 22 }, (_, i) => row(`p${i + 1}`, 100 - i));
    const { xi, bench } = teamOfTheWeek(rows);
    expect(xi.map((r) => r?.name)).toEqual(["p1", "p2", "p3", "p4", "p5", "p6", "p7", "p8", "p9", "p10", "p11"]);
    expect(bench.map((r) => r.name)).toEqual(["p12", "p13", "p14", "p15", "p16", "p17", "p18", "p19", "p20"]);
  });
  it("leaves empty places when few have played", () => {
    const { xi, bench } = teamOfTheWeek([row("a", 9), row("b", 0)]);
    expect(xi.filter(Boolean)).toHaveLength(1);
    expect(xi).toHaveLength(11);
    expect(bench).toEqual([]);
  });
});

describe("yourSpot", () => {
  it("knows the team, the bench and the rest", () => {
    expect(yourSpot({ position: 4, points: 240 }, 224)).toEqual({ kind: "xi", gap: null });
    expect(yourSpot({ position: 15, points: 212 }, 224)).toEqual({ kind: "bench", gap: 13 });
    expect(yourSpot({ position: 214, points: 96 }, 224)).toEqual({ kind: "below", gap: 129 });
  });
  it("points to Clash when it could take you past the player above", () => {
    const clash = (name: string, points: number, c: number, mine = false) => ({ name, points, mine, clash: c });
    expect(gapLine([clash("tunde", 480, 78), clash("You", 469, 41, true)])).toBe("Win 12 more on Clash to pass tunde");
    expect(gapLine([clash("ada", 520, 90), clash("tunde", 480, 78), clash("You", 469, 41, true)])).toBe("Win 12 more on Clash to pass tunde");
    expect(gapLine([clash("tunde", 480, 78), clash("You", 400, 41, true)])).toBe("80 behind tunde");
    expect(gapLine([clash("tunde", 480, 78), clash("You", 469, 95, true)])).toBe("11 behind tunde");
  });
  it("waits for you to play", () => {
    expect(yourSpot(null, 224).kind).toBe("idle");
    expect(yourSpot({ position: 30, points: 0 }, 224).kind).toBe("idle");
  });
});
