import { describe, expect, it } from "vitest";
import { lineClubs, questionClubs, questionLine } from "./formats";

describe("questionClubs", () => {
  it("splits a player from his club", () => {
    expect(questionClubs("Frank Lampard at Chelsea")).toEqual({ who: "Frank Lampard", clubs: ["Chelsea"] });
  });

  it("keeps both clubs of a move in order", () => {
    expect(questionClubs("Yaya Touré at Barcelona → Man City")).toEqual({ who: "Yaya Touré", clubs: ["Barcelona", "Man City"] });
  });

  it("takes the last at, so names and moments stay whole", () => {
    expect(questionClubs("Henry, Pires and Vieira at Arsenal")).toEqual({ who: "Henry, Pires and Vieira", clubs: ["Arsenal"] });
    expect(questionClubs("Rooney's debut at Man United")).toEqual({ who: "Rooney's debut", clubs: ["Man United"] });
  });

  it("leaves questions without a club alone", () => {
    expect(questionClubs("2003/04")).toBeNull();
    expect(questionClubs("Arsenal 2–0 Burnley · Sat 25 Oct")).toBeNull();
    expect(questionClubs(null)).toBeNull();
  });
});

describe("questionLine", () => {
  it("reads a scoreline with its date", () => {
    expect(questionLine("Arsenal 2–0 Burnley · Sat 25 Oct")).toEqual({ kind: "match", home: "Arsenal", away: "Burnley", score: "2–0", when: "Sat 25 Oct" });
    expect(questionLine("Arsenal 5–0 Chelsea · Apr 2024")).toMatchObject({ kind: "match", when: "Apr 2024" });
  });

  it("reads a famous result without a date, two-word clubs too", () => {
    expect(questionLine("Man United 8–2 Arsenal")).toEqual({ kind: "match", home: "Man United", away: "Arsenal", score: "8–2", when: null });
    expect(questionLine("Nottm Forest 10–1 Man United")).toMatchObject({ home: "Nottm Forest", away: "Man United", score: "10–1" });
  });

  it("splits a club's title from the club, and a player's Golden Boot from the player", () => {
    expect(questionLine("Man United's 7th Premier League title")).toEqual({ kind: "title", club: "Man United", what: "7th Premier League title" });
    expect(questionLine("Leicester's Premier League title")).toEqual({ kind: "title", club: "Leicester", what: "Premier League title" });
    expect(questionLine("Spurs' Premier League title")).toEqual({ kind: "title", club: "Spurs", what: "Premier League title" });
    expect(questionLine("Thierry Henry's 2nd Golden Boot")).toEqual({ kind: "award", who: "Thierry Henry", what: "2nd Golden Boot" });
  });

  it("knows a season and leaves anything else plain", () => {
    expect(questionLine("2003/04")).toEqual({ kind: "season", season: "2003/04" });
    expect(questionLine("Something new")).toEqual({ kind: "plain", text: "Something new" });
  });

  it("keeps the at questions as before", () => {
    expect(questionLine("Frank Lampard at Chelsea")).toEqual({ kind: "at", who: "Frank Lampard", clubs: ["Chelsea"] });
  });

  it("lists the clubs to dress", () => {
    expect(lineClubs("Arsenal 2–0 Burnley · Sat 25 Oct")).toEqual(["Arsenal", "Burnley"]);
    expect(lineClubs("Man United's 7th Premier League title")).toEqual(["Man United"]);
    expect(lineClubs("Thierry Henry's 2nd Golden Boot")).toEqual([]);
    expect(lineClubs(null)).toEqual([]);
  });
});
