import { describe, expect, it } from "vitest";
import { gameDate, gameDateClosesAt, matchweekBounds, addDays } from "./time";

describe("gameDate", () => {
  it("rolls over at 23:00 UTC (midnight GMT+1)", () => {
    expect(gameDate(new Date("2026-11-27T22:59:59Z"))).toBe("2026-11-27");
    expect(gameDate(new Date("2026-11-27T23:00:00Z"))).toBe("2026-11-28");
  });

  it("does not shift with UK clocks (BST in summer)", () => {
    expect(gameDate(new Date("2027-07-01T22:59:59Z"))).toBe("2027-07-01");
    expect(gameDate(new Date("2027-07-01T23:00:00Z"))).toBe("2027-07-02");
  });
});

describe("gameDateClosesAt", () => {
  it("closes at 23:00 UTC the same day", () => {
    expect(gameDateClosesAt("2026-11-27").toISOString()).toBe("2026-11-27T23:00:00.000Z");
  });
});

describe("matchweekBounds", () => {
  it("runs Monday to Sunday", () => {
    // Launch Friday, Nov 27 2026
    expect(matchweekBounds("2026-11-27")).toEqual({ startsOn: "2026-11-23", endsOn: "2026-11-29" });
    expect(matchweekBounds("2026-11-23")).toEqual({ startsOn: "2026-11-23", endsOn: "2026-11-29" });
    expect(matchweekBounds("2026-11-29")).toEqual({ startsOn: "2026-11-23", endsOn: "2026-11-29" });
  });

  it("keeps a midweek round in the same week as the weekend before it", () => {
    // Sat Dec 5 and a Wednesday Dec 9 round land in different weeks: Wed belongs to Dec 7-13
    expect(matchweekBounds("2026-12-05").startsOn).toBe("2026-11-30");
    expect(matchweekBounds("2026-12-09").startsOn).toBe("2026-12-07");
  });
});

describe("addDays", () => {
  it("crosses month and year ends", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2027-01-01", -1)).toBe("2026-12-31");
  });
});
