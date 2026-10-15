import { describe, expect, it } from "vitest";
import { buildKeys, levenshtein, matchAnswer, normalizeName } from "./match";

const answers = buildKeys([
  { id: 1, text: "Ashley Cole", aliases: [] },
  { id: 2, text: "Cesc Fàbregas", aliases: ["Cesc"] },
  { id: 3, text: "Petr Čech", aliases: [] },
  { id: 4, text: "Pierre-Emerick Aubameyang", aliases: ["Auba"] },
  { id: 5, text: "Kepa Arrizabalaga", aliases: ["Kepa"] },
]);

describe("normalizeName", () => {
  it("strips accents, case and punctuation", () => {
    expect(normalizeName("  Pierre-Emerick  AUBAMEYANG ")).toBe("pierre emerick aubameyang");
    expect(normalizeName("Čech")).toBe("cech");
  });
});

describe("levenshtein", () => {
  it("counts edits", () => {
    expect(levenshtein("fabregas", "fabregaz")).toBe(1);
    expect(levenshtein("kitten", "sitting")).toBe(3);
  });
});

describe("matchAnswer", () => {
  it("matches full names, aliases and unique surnames", () => {
    expect(matchAnswer("ashley cole", answers)).toBe(1);
    expect(matchAnswer("Cole", answers)).toBe(1);
    expect(matchAnswer("auba", answers)).toBe(4);
    expect(matchAnswer("cech", answers)).toBe(3);
  });

  it("allows small typos on longer names", () => {
    expect(matchAnswer("fabregaz", answers)).toBe(2);
    expect(matchAnswer("aubameyeng", answers)).toBe(4);
  });

  it("rejects wrong and near-but-wrong names", () => {
    expect(matchAnswer("Joe Cole", answers)).toBeNull();
    expect(matchAnswer("Lampard", answers)).toBeNull();
    expect(matchAnswer("cesk", answers)).toBeNull(); // short keys get no typo allowance
    expect(matchAnswer("", answers)).toBeNull();
  });

  it("does not give a shared surname to either player", () => {
    const twoColes = buildKeys([
      { id: 1, text: "Ashley Cole", aliases: [] },
      { id: 2, text: "Joe Cole", aliases: [] },
    ]);
    expect(matchAnswer("cole", twoColes)).toBeNull();
    expect(matchAnswer("joe cole", twoColes)).toBe(2);
  });
});
