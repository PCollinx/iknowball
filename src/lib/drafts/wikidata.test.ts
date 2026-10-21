import { describe, expect, it } from "vitest";
import { clubPlayersQuery, parseClubPlayers, parsePositions, positionFromLabels, positionsQuery } from "./wikidata";

const E = "http://www.wikidata.org/entity/";
const row = (over: Record<string, string | undefined> = {}) => {
  const base: Record<string, string | undefined> = {
    club: `${E}Q9616`,
    player: `${E}Q11908`,
    playerLabel: "Cesc Fàbregas",
    playerAltLabel: "Cesc, Francesc Fàbregas i Soler, Fàbregas",
    st: `${E}statement/Q11908-abc`,
    start: "2014-06-12T00:00:00Z",
    end: "2019-01-11T00:00:00Z",
    dob: "1987-05-04T00:00:00Z",
    apps: "109",
    goals: "15",
    ...over,
  };
  return Object.fromEntries(Object.entries(base).filter(([, v]) => v !== undefined).map(([k, v]) => [k, { value: v! }]));
};

describe("parseClubPlayers", () => {
  it("turns a SPARQL row into a spell", () => {
    expect(parseClubPlayers({ results: { bindings: [row()] } })).toEqual([
      {
        clubQid: "Q9616",
        playerQid: "Q11908",
        name: "Cesc Fàbregas",
        aliases: ["Cesc", "Francesc Fàbregas i Soler", "Fàbregas"],
        statement: "Q11908-abc",
        joinedOn: "2014-06-12",
        leftOn: "2019-01-11",
        dateOfBirth: "1987-05-04",
        apps: 109,
        goals: 15,
      },
    ]);
  });

  it("skips players without an English label and repeated statements", () => {
    const spells = parseClubPlayers({
      results: { bindings: [row({ playerLabel: "Q11908" }), row(), row({ dob: "1987-05-05T00:00:00Z" })] },
    });
    expect(spells).toHaveLength(1);
  });

  it("keeps missing dates as null and drops short aliases", () => {
    const [s] = parseClubPlayers({ results: { bindings: [row({ start: undefined, end: undefined, playerAltLabel: "CF, Cesc" })] } });
    expect([s.joinedOn, s.leftOn, s.aliases]).toEqual([null, null, ["Cesc"]]);
  });

  it("keeps missing or odd counts as null", () => {
    const [s] = parseClubPlayers({ results: { bindings: [row({ apps: undefined, goals: "-3" })] } });
    expect([s.apps, s.goals]).toEqual([null, null]);
  });
});

describe("clubPlayersQuery", () => {
  it("escapes quotes in the article title", () => {
    expect(clubPlayersQuery('A "B" F.C.')).toContain('schema:name "A \\"B\\" F.C."@en');
  });
});

describe("positions", () => {
  it("puts each player in one line", () => {
    expect(positionFromLabels(["goalkeeper"])).toBe("GK");
    expect(positionFromLabels(["centre-back", "full-back"])).toBe("DEF");
    expect(positionFromLabels(["defensive midfielder"])).toBe("MID");
    expect(positionFromLabels(["attacking midfielder", "winger", "forward"])).toBe("FWD");
    expect(positionFromLabels(["midfielder", "forward"])).toBe("MID");
    expect(positionFromLabels(["wing-back", "midfielder"])).toBe("MID");
    expect(positionFromLabels(["association football manager"])).toBeNull();
  });

  it("parses grouped labels by player id", () => {
    const json = {
      results: {
        bindings: [
          { player: { value: `${E}Q11908` }, positions: { value: "midfielder|attacking midfielder" } },
          { player: { value: `${E}Q2} ` }, positions: { value: "coach" } },
        ],
      },
    };
    expect([...parsePositions(json)]).toEqual([["Q11908", "MID"]]);
  });

  it("only queries well-formed ids", () => {
    const q = positionsQuery(["Q1", "Q2 } DROP", "Q33"]);
    expect(q).toContain("VALUES ?player { wd:Q1 wd:Q33 }");
  });
});
