import { describe, expect, it } from "vitest";
import { recallIssues } from "@/lib/maker/parse";
import { draftDay, orderAnswers, pickPair, recallAnswers, recallSeconds, type SharedPlayer } from "./generate";

const player = (id: number, name: string, aliases: string[] = [], joinedA: string | null = null, joinedB: string | null = null): SharedPlayer => ({
  id,
  name,
  aliases,
  joinedA,
  joinedB,
});

describe("pickPair", () => {
  const candidates = [
    { a: 1, b: 2, players: 12 },
    { a: 3, b: 4, players: 3 },
    { a: 5, b: 6, players: 14 },
    { a: 1, b: 5, players: 40 },
  ];

  it("prefers the day's fixture when it makes a good list", () => {
    expect(pickPair("2026-10-17", candidates, [[2, 1]], new Set())).toEqual([2, 1]);
  });

  it("skips fixtures with too few or too many shared players, and used pairs", () => {
    expect(pickPair("2026-10-17", candidates, [[3, 4], [5, 1], [1, 2]], new Set(["1-2"]))).toEqual([5, 6]);
  });

  it("falls back to the same unused pair for the same date", () => {
    const a = pickPair("2026-10-18", candidates, [], new Set());
    expect(a).toEqual(pickPair("2026-10-18", candidates, [], new Set()));
    expect(pickPair("2026-10-18", candidates, [], new Set(["1-2", "5-6"]))).toBeNull();
  });

  it("rests clubs from nearby days when another pair is free, but not over a fixture", () => {
    expect(pickPair("2026-10-18", candidates, [], new Set(), new Set([1]))).toEqual([5, 6]);
    expect(pickPair("2026-10-18", candidates, [], new Set(["5-6"]), new Set([1]))).toEqual([1, 2]);
    expect(pickPair("2026-10-18", candidates, [[1, 2]], new Set(), new Set([1]))).toEqual([1, 2]);
  });
});

describe("recallAnswers", () => {
  it("drops aliases two answers would share and keeps the key clean", () => {
    const lines = recallAnswers([
      player(1, "Ashley Cole", ["Cole", "Ash"]),
      player(2, "Joe Cole", ["Cole"]),
      player(3, "Cesc Fàbregas", ["Cesc", "Fàbregas"]),
      player(4, "Ashley Cole"),
    ]);
    expect(lines).toEqual([
      { text: "Ashley Cole", aliases: ["Ash"] },
      { text: "Cesc Fàbregas", aliases: ["Cesc"] },
      { text: "Joe Cole", aliases: [] },
    ]);
    expect(recallIssues(lines).errors).toEqual([]);
  });

  it("drops an alias that is another answer's name", () => {
    const lines = recallAnswers([player(1, "Ronaldo", []), player(2, "Cristiano Ronaldo", ["Ronaldo", "CR7"])]);
    expect(lines.find((l) => l.text === "Cristiano Ronaldo")!.aliases).toEqual(["CR7"]);
  });
});

describe("orderAnswers", () => {
  const squad = ["1993", "1997", "2001", "2004", "2008", "2012", "2016", "2020"].map((y, i) => player(i + 1, `Player ${i + 1}`, [], `${y}-07-01`));

  it("picks five players from evenly spaced years, earliest first", () => {
    const order = orderAnswers(squad, "joinedA", new Set(), 0);
    expect(order.map((o) => o.note)).toEqual(["1993", "2001", "2008", "2012", "2020"]);
  });

  it("needs five different years from the Premier League era", () => {
    const old = [player(1, "A", [], "1985-01-01"), ...squad.slice(0, 4)];
    expect(orderAnswers(old, "joinedA", new Set(), 0)).toEqual([]);
  });

  it("prefers a player not used recently when two joined the same year", () => {
    const twins = [...squad, player(99, "Fresh Face", [], "1993-01-01")];
    const order = orderAnswers(twins, "joinedA", new Set(["player 1"]), 0);
    expect(order[0].text).toBe("Fresh Face");
  });
});

describe("draftDay", () => {
  it("writes both parts with fixture wording", () => {
    const players = ["1993", "1997", "2001", "2004", "2008", "2012"].map((y, i) => player(i + 1, `Player ${i + 1}`, [], `${y}-07-01`, `${y}-08-01`));
    const day = draftDay("2026-10-17", { id: 1, name: "Chelsea" }, { id: 2, name: "Arsenal" }, players, new Set());
    expect(day.part1.title).toBe("Chelsea v Arsenal");
    expect(day.part1.prompt).toBe("Name the 6 players who've played for both Chelsea and Arsenal since 1992.");
    expect(day.part2?.answers).toHaveLength(5);
  });
});

describe("recallSeconds", () => {
  it("gives about five seconds a name, within one to three minutes", () => {
    expect([recallSeconds(3), recallSeconds(17), recallSeconds(40)]).toEqual([60, 130, 180]);
  });
});
