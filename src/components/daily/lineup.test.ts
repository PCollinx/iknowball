import { describe, expect, it } from "vitest";
import type { Position } from "@/lib/daily/data";
import { lineup } from "./lineup";

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
