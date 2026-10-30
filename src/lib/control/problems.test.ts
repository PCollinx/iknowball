import { describe, expect, it } from "vitest";
import { dailyProblems, fixtureProblems, importProblems, matchDataProblems, staleRuns } from "./problems";

describe("job problems", () => {
  it("flags a skipped fixture sync and teams we don't know", () => {
    expect(fixtureProblems({ skipped: "Highlightly budget used" })).toHaveLength(1);
    expect(fixtureProblems({ calls: 12, fixtures: 380, ucl: 9, cups: 4, finished: 100, unknownTeams: ["Sunderland AFC"] })[0]).toContain("Sunderland AFC");
    expect(fixtureProblems({ calls: 12, fixtures: 380, ucl: 9, cups: 4, finished: 100, unknownTeams: [] })).toEqual([]);
  });

  it("lets match data run out of calls, but not before a single match", () => {
    const base = { calls: 60, table: 20, pairs: [], meetings: 0, boxScores: 0, newPlayers: 0 };
    expect(matchDataProblems({ ...base, matches: 25, left: 80 })).toEqual([]);
    expect(matchDataProblems({ ...base, matches: 0, left: 80 })).toHaveLength(1);
  });

  it("names each club the import failed", () => {
    expect(importProblems({ results: [{ club: "Arsenal", error: "Wikidata timed out" }, { club: "Chelsea", players: 1, spells: 1, positions: 0, facts: 0, managers: 0 }], failed: 1, left: [] })).toEqual(["Arsenal: Wikidata timed out"]);
  });

  it("wants both parts of today's and tomorrow's Daily scheduled", () => {
    const rows = [
      { play_date: "2026-10-31", part: 1, status: "scheduled" },
      { play_date: "2026-10-31", part: 2, status: "scheduled" },
      { play_date: "2026-11-01", part: 1, status: "scheduled" },
      { play_date: "2026-11-01", part: 2, status: "draft" },
    ];
    expect(dailyProblems(rows, ["2026-10-31", "2026-11-01"])).toEqual(["Sun 1 Nov: Part 2 not scheduled."]);
    expect(dailyProblems([], ["2026-11-02"])).toEqual(["No Daily for Mon 2 Nov."]);
  });

  it("finds runs the platform cut off and jobs that missed a night", () => {
    const now = new Date("2026-10-31T12:00:00Z");
    const stale = staleRuns(
      [
        { id: 1, job: "match-data", status: "running", started_at: "2026-10-31T11:50:00Z" },
        { id: 2, job: "fixtures", status: "ok", started_at: "2026-10-29T23:30:00Z" },
        { id: 3, job: "drafts", status: "running", started_at: "2026-10-31T11:59:30Z" },
      ],
      now,
    );
    expect(stale.map((s) => [s.job, s.kind])).toEqual([
      ["fixtures", "missed"],
      ["match-data", "timed-out"],
    ]);
  });
});
