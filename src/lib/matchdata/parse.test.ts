import { describe, expect, it } from "vitest";
import box from "./box-score.test-data.json";
import match from "./match.test-data.json";
import standings from "./standings.test-data.json";
import { boxRowsOf, eventsOf, matchPlayer, minuteOrder, shirtName, tableOf, type HighlightlyBoxTeam, type HighlightlyEvent } from "./parse";

describe("events", () => {
  it("keeps goals, penalties and cards in match order, without substitutions", () => {
    const rows = eventsOf(match.events as HighlightlyEvent[]);
    expect(rows.filter((r) => r.type === "goal").map((r) => r.playerName)).toEqual(["J. Sancho"]);
    expect(rows.find((r) => r.type === "penalty")?.playerName).toBe("Jorginho");
    expect(rows.map((r) => r.minute).slice(-3)).toEqual(["90+2", "90+5", "90+6"]);
    expect(rows.map((r) => r.seq)).toEqual(rows.map((_, i) => i + 1));
    expect(rows.some((r) => r.playerName === "T. Werner")).toBe(false);
  });

  it("drops a goal VAR cancelled", () => {
    const team = { id: 1, name: "Chelsea" };
    const rows = eventsOf([
      { team, time: "10", type: "Goal", player: "A" },
      { team, time: "20", type: "Goal", player: "B" },
      { team, time: "21", type: "VAR Goal Cancelled - Offside" },
    ]);
    expect(rows.map((r) => r.playerName)).toEqual(["A"]);
  });

  it("orders stoppage time after the minute", () => {
    expect(minuteOrder("45+1")).toBeGreaterThan(minuteOrder("45"));
    expect(minuteOrder("45+1")).toBeLessThan(minuteOrder("46"));
  });
});

describe("box score", () => {
  const rows = boxRowsOf(box as HighlightlyBoxTeam[]);

  it("reads both teams' players with their stats", () => {
    expect(rows).toHaveLength(40);
    const cunha = rows.find((r) => r.name === "Matheus Cunha")!;
    expect(cunha).toMatchObject({ goals: 1, position: "MID", started: true, minutes: 81, rating: 7.46 });
    expect(rows.find((r) => r.name === "E. Fernández")!.keyPasses).toBe(5);
  });

  it("marks starters and unused substitutes", () => {
    expect(rows.find((r) => r.name === "A. Garnacho")!.started).toBe(false);
    expect(rows.find((r) => r.name === "Marc Guiu")).toMatchObject({ minutes: 0, rating: null, started: false });
  });
});

describe("standings", () => {
  it("reads the table", () => {
    const table = tableOf(standings);
    expect(table).toHaveLength(20);
    expect(table[0]).toMatchObject({ position: 1, teamName: "Manchester City", points: 21, played: 8, won: 7 });
  });
});

describe("matching players", () => {
  const ours = [
    { id: 1, knownAs: "Moisés Caicedo", fullName: "Moisés Caicedo", aliases: [] },
    { id: 2, knownAs: "Malo Gusto", fullName: "Malo Gusto", aliases: [] },
    { id: 3, knownAs: "Wesley Fofana", fullName: "Wesley Fofana", aliases: [] },
    { id: 4, knownAs: "Youssouf Fofana", fullName: "Youssouf Fofana", aliases: [] },
    { id: 5, knownAs: "Casemiro", fullName: "Carlos Henrique Casimiro", aliases: [] },
  ];

  it("finds the same name, an initial and surname, or our name inside his full name", () => {
    expect(matchPlayer({ name: "M. Gusto", fullName: "Malo Gusto" }, ours)).toBe(2);
    expect(matchPlayer({ name: "M. Caicedo", fullName: "Moisés Isaac Caicedo Corozo" }, ours)).toBe(1);
    expect(matchPlayer({ name: "W. Fofana", fullName: "Wesley Tidjan Fofana" }, ours)).toBe(3);
    expect(matchPlayer({ name: "Casemiro", fullName: "Carlos Henrique Casimiro" }, ours)).toBe(5);
  });

  it("gives up when nobody or more than one fits", () => {
    expect(matchPlayer({ name: "J. Hato", fullName: "Jorrel Hato" }, ours)).toBeNull();
    expect(matchPlayer({ name: "Fofana", fullName: "Fofana" }, ours)).toBeNull();
  });

  it("names a player new to us without the initial", () => {
    expect(shirtName({ name: "J. Hato", fullName: "Jorrel Hato" })).toBe("Jorrel Hato");
    expect(shirtName({ name: "Estêvão", fullName: "Estêvão Willian Almeida de Oliveira Gonçalves" })).toBe("Estêvão");
  });
});
