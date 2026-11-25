import { describe, expect, it } from "vitest";
import { questionClubs } from "./formats";

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
