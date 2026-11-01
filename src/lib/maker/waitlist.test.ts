import { describe, expect, it } from "vitest";
import { summarise, type WaitlistRow } from "./waitlist";

const row = (id: number, created_at: string, more: Partial<WaitlistRow> = {}): WaitlistRow => ({
  id,
  email: `p${id}@example.com`,
  name: null,
  favourite_club: null,
  league_name: null,
  league_id: null,
  created_at,
  ...more,
});

describe("summarise", () => {
  const now = new Date("2026-11-03T10:00:00Z");

  it("numbers the queue by sign-up order and lists newest first", () => {
    const s = summarise([row(7, "2026-11-01T09:00:00Z"), row(3, "2026-11-01T08:00:00Z"), row(9, "2026-11-03T08:00:00Z")], now);
    expect(s.entries.map((e) => [e.id, e.no])).toEqual([
      [9, 3],
      [7, 2],
      [3, 1],
    ]);
  });

  it("counts days on the WAT clock, with empty days in between", () => {
    // 23:30 UTC on 1 Nov is 00:30 WAT on 2 Nov.
    const s = summarise([row(1, "2026-11-01T08:00:00Z"), row(2, "2026-11-01T23:30:00Z"), row(3, "2026-11-03T09:00:00Z")], now);
    expect(s.days).toEqual([
      { date: "2026-11-01", count: 1 },
      { date: "2026-11-02", count: 1 },
      { date: "2026-11-03", count: 1 },
    ]);
    expect(s.today).toBe(1);
  });

  it("ranks clubs and counts leagues named", () => {
    const s = summarise(
      [
        row(1, "2026-11-01T08:00:00Z", { favourite_club: "Chelsea", league_name: "Office" }),
        row(2, "2026-11-01T09:00:00Z", { favourite_club: "Arsenal" }),
        row(3, "2026-11-01T10:00:00Z", { favourite_club: "Chelsea" }),
        row(4, "2026-11-01T11:00:00Z", { league_name: "Uni lads" }),
      ],
      now,
    );
    expect(s.clubs).toEqual([
      { club: "Chelsea", count: 2 },
      { club: "Arsenal", count: 1 },
      { club: "Neutral", count: 1 },
    ]);
    expect(s.leagues).toBe(2);
  });

  it("is empty with nobody signed", () => {
    expect(summarise([], now)).toMatchObject({ total: 0, today: 0, days: [], clubs: [], entries: [] });
  });
});
