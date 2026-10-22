import { describe, expect, it } from "vitest";
import type { Position } from "@/lib/daily/data";
import { fullTimeLineup, lineup } from "./lineup";

const found = (...positions: (Position | null)[]) => positions.map((position, i) => ({ id: i + 1, text: `P${i + 1}`, position }));
const onPitch = (l: ReturnType<typeof lineup>, line: Position) => l.pitch.filter((s) => s.line === line && s.player).map((s) => s.player!.id);

describe("lineup", () => {
  it("puts each player in their own line", () => {
    const l = lineup(found("FWD", "GK", "DEF", "MID"), 23);
    expect(onPitch(l, "FWD")).toEqual([1]);
    expect(onPitch(l, "GK")).toEqual([2]);
    expect(onPitch(l, "DEF")).toEqual([3]);
    expect(onPitch(l, "MID")).toEqual([4]);
  });

  it("sends a second keeper to the bench", () => {
    const l = lineup(found("GK", "GK"), 23);
    expect(onPitch(l, "GK")).toEqual([1]);
    expect(l.bench[0]?.id).toBe(2);
  });

  it("never puts a player with no known position in goal", () => {
    const l = lineup(found(...Array<null>(11).fill(null)), 23);
    expect(onPitch(l, "GK")).toEqual([]);
    expect(l.bench.filter(Boolean).map((p) => p!.id)).toEqual([11]);
  });

  it("benches a full line's extra players", () => {
    const l = lineup(found("FWD", "FWD", "FWD"), 23);
    expect(onPitch(l, "FWD")).toEqual([1, 2]);
    expect(l.bench[0]?.id).toBe(3);
  });

  it("shows every answer once: pitch places plus bench", () => {
    const l = lineup(found("GK", "DEF", "MID"), 23);
    expect(l.pitch.length + l.bench.length).toBe(23);
  });

  it("with fewer than 11 answers shows only filled places, the rest still to find", () => {
    const l = lineup(found("DEF", "FWD"), 8);
    expect(l.fullXI).toBe(false);
    expect(l.pitch.map((s) => s.player!.id)).toEqual([1, 2]);
    expect(l.bench).toEqual(Array(6).fill(null));
  });
});

describe("fullTimeLineup", () => {
  const missed = (...positions: (Position | null)[]) => positions.map((position, i) => ({ id: 100 + i, text: `M${i + 1}`, position }));

  it("fills the gaps with missed players by position, after the found ones", () => {
    const l = fullTimeLineup(found("DEF", "DEF", "DEF", "DEF", "DEF"), missed("DEF", "MID"));
    const def = l.pitch.filter((s) => s.line === "DEF");
    expect(def.map((s) => s.player?.id)).toEqual([1, 2, 3, 4]);
    expect(l.bench.map((p) => p.id)).toEqual([5]);
    expect(l.away.map((m) => m.id)).toEqual([100]);
    expect(l.pitch.find((s) => s.player?.id === 101)?.missed).toBe(true);
  });

  it("keeps a missed player with no position out of goal", () => {
    const l = fullTimeLineup([], missed(...Array<null>(11).fill(null)));
    expect(l.pitch.find((s) => s.line === "GK")?.player).toBeNull();
    expect(l.away.map((m) => m.id)).toEqual([110]);
  });

  it("shows only filled places for a round of fewer than 11", () => {
    const l = fullTimeLineup(found("FWD"), missed("GK"));
    expect(l.pitch).toHaveLength(2);
  });
});
