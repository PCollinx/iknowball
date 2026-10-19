import { describe, expect, it } from "vitest";
import sample from "./sample.test-data.json";
import { clubKey, fixtureOf, parseScore, plRound, statusOf, type HighlightlyMatch } from "./parse";

describe("Highlightly fixtures", () => {
  it("reads a finished match", () => {
    const f = fixtureOf(sample[0] as HighlightlyMatch);
    expect(f).toMatchObject({ highlightly_match_id: 1325378820, season: 2026, pl_round: 7, status: "finished", home_score: 3, away_score: 1 });
    // Monday 19 Oct 2026, 20:00 in Lagos: that week starts on the same day.
    expect(f.matchweek_starts_on).toBe("2026-10-19");
  });

  it("reads a match still to play", () => {
    const f = fixtureOf(sample[1] as HighlightlyMatch);
    expect(f).toMatchObject({ status: "scheduled", home_score: null, away_score: null, pl_round: 26, matchweek_starts_on: "2027-02-15" });
  });

  it("puts a late Sunday kickoff in Lagos time", () => {
    // 23:30 UTC Sunday is 00:30 Monday in Lagos: next week.
    const f = fixtureOf({ ...(sample[1] as HighlightlyMatch), date: "2026-10-25T23:30:00.000Z" });
    expect(f.matchweek_starts_on).toBe("2026-10-26");
  });

  it("parses rounds, scores and states", () => {
    expect(plRound("Regular Season - 38")).toBe(38);
    expect(plRound(null)).toBeNull();
    expect(parseScore("0 - 0")).toEqual([0, 0]);
    expect(parseScore(null)).toBeNull();
    expect(statusOf("Second half", true)).toBe("live");
    expect(statusOf("Half time", true)).toBe("live");
    expect(statusOf("Finished after extra time", true)).toBe("finished");
    expect(statusOf("Postponed", false)).toBe("postponed");
    expect(statusOf("Not started", false)).toBe("scheduled");
  });

  it("maps Highlightly's team names onto ours", () => {
    expect(clubKey("Manchester United")).toBe("man united");
    expect(clubKey("Tottenham")).toBe("spurs");
    expect(clubKey("Arsenal")).toBe("arsenal");
  });
});
