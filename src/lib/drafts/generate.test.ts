import { describe, expect, it } from "vitest";
import { recallIssues } from "@/lib/maker/parse";
import { draftDay, eraDecoys, eraPicks, orderAnswers, pairingFor, pickPair, rapidPicks, recallAnswers, recallSeconds, type SharedPlayer } from "./generate";

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

describe("pickPair with the popular-games rules", () => {
  // 1 and 2 are big six, 3 is another English club, 4 and 5 are English minnows, 9 is a European giant.
  const rules = { bigSix: new Set([1, 2]), europe: new Set([9]) };
  const pairs = [
    { a: 1, b: 2, players: 12 },
    { a: 1, b: 3, players: 10 },
    { a: 4, b: 5, players: 10 },
    { a: 1, b: 9, players: 8 },
    { a: 3, b: 9, players: 8 },
  ];

  it("never picks a fixture without one of the big six", () => {
    expect(pickPair("2026-10-17", pairs, [[4, 5], [3, 1]], new Set(), new Set(), rules)).toEqual([3, 1]);
  });

  it("off a fixture, prefers two of the big six, then one, and never two minnows", () => {
    expect(pickPair("2026-10-17", pairs, [], new Set(), new Set(), rules)).toEqual([1, 2]);
    expect(pickPair("2026-10-17", pairs, [], new Set(["1-2"]), new Set(), rules)).toEqual([1, 3]);
  });

  it("keeps Europe's giants for Champions League nights", () => {
    expect(pickPair("2026-10-17", pairs, [], new Set(["1-2", "1-3"]), new Set(), rules)).toEqual([1, 2]);
    expect(pickPair("2026-10-17", pairs, [[1, 9]], new Set(["1-2"]), new Set(), rules)).toEqual([1, 3]);
  });

  it("on a UCL night picks a tie with a top club, the big six's first", () => {
    expect(pickPair("2026-10-21", pairs, [[1, 2]], new Set(), new Set(), rules, [[3, 9], [9, 1]])).toEqual([9, 1]);
    expect(pickPair("2026-10-21", pairs, [[1, 2]], new Set(["1-9"]), new Set(), rules, [[3, 9], [9, 1]])).toEqual([3, 9]);
  });

  it("reuses a popular pair rather than going obscure", () => {
    expect(pickPair("2026-10-17", pairs, [], new Set(["1-2", "1-3"]), new Set(), rules)).not.toEqual([4, 5]);
    expect(pickPair("2026-10-17", pairs, [], new Set(["1-2", "1-3"]), new Set(), rules)).not.toBeNull();
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

describe("rapidPicks", () => {
  const home = { id: 1, name: "Chelsea" };
  const away = { id: 2, name: "Arsenal" };
  const shared = Array.from({ length: 12 }, (_, i) => player(i + 1, `Both ${i + 1}`));
  const decoys = Array.from({ length: 40 }, (_, i) => ({ id: 100 + i, name: `Only ${i + 1}`, club: i % 2 ? 2 : 1 }));

  it("asks ten questions, one right player and three from just one club each", () => {
    const lines = rapidPicks(shared, decoys, home, away, new Set(), 3);
    expect(lines).toHaveLength(10);
    for (const l of lines) {
      expect(l.answer).toMatch(/^Both/);
      expect(l.wrong).toHaveLength(3);
      expect(l.wrong.every((w) => w.startsWith("Only"))).toBe(true);
    }
    const options = lines.flatMap((l) => [l.answer, ...l.wrong]);
    expect(new Set(options).size).toBe(options.length);
  });

  it("never offers a player who played for both as a wrong option", () => {
    const sneaky = [...decoys, { id: 999, name: "Both 1", club: 1 }];
    const lines = rapidPicks(shared, sneaky, home, away, new Set(), 0);
    expect(lines.flatMap((l) => l.wrong)).not.toContain("Both 1");
  });

  it("gives up below five questions", () => {
    expect(rapidPicks(shared.slice(0, 4), decoys, home, away, new Set(), 0)).toEqual([]);
    expect(rapidPicks(shared, decoys.slice(0, 10), home, away, new Set(), 0)).toEqual([]);
  });
});

describe("eraDecoys", () => {
  it("offers three periods as long as the real one, inside the era", () => {
    const wrong = eraDecoys(1999, 2007, 0, 2026)!;
    expect(wrong).toHaveLength(3);
    for (const w of wrong) {
      const [a, b] = w.split("–").map(Number);
      expect(b - a).toBe(8);
      expect(a).toBeGreaterThanOrEqual(1990);
      expect(b).toBeLessThanOrEqual(2026);
      expect(w).not.toBe("1999–2007");
    }
  });

  it("returns null when there's no room for three", () => {
    expect(eraDecoys(1992, 2020, 0, 2026)).toBeNull();
  });
});

describe("eraPicks", () => {
  const club = { id: 1, name: "Arsenal" };
  const spells = [
    ["Henry", "1999", "2007"],
    ["Pires", "2000", "2006"],
    ["Fàbregas", "2003", "2011"],
    ["Walcott", "2006", "2018"],
    ["Giroud", "2012", "2018"],
    ["Ancient", "1980", "1990"],
    ["Loanee", "2010", "2010"],
  ].map(([name, a, b], i) => ({ id: i + 1, name, joined: `${a}-07-01`, left: `${b}-06-30` }));

  it("asks when each was there, with the right period among the options", () => {
    const lines = eraPicks(spells, club, new Set(), 0, 2026);
    expect(lines.length).toBeGreaterThanOrEqual(4);
    for (const l of lines) {
      expect(l.question).toMatch(/ at Arsenal$/);
      expect(l.wrong).toHaveLength(3);
    }
    expect(lines.find((l) => l.question === "Henry at Arsenal")?.answer).toBe("1999–2007");
    expect(lines.map((l) => l.question)).not.toContain("Ancient at Arsenal");
    expect(lines.map((l) => l.question)).not.toContain("Loanee at Arsenal");
  });
});

describe("draftDay with picks data", () => {
  it("makes Part 1 Rapid picks with the right option among the choices", () => {
    const shared = Array.from({ length: 8 }, (_, i) => player(i + 1, `Both ${i + 1}`, [], `${1995 + i}-07-01`, `${1996 + i}-07-01`));
    const decoys = Array.from({ length: 30 }, (_, i) => ({ id: 100 + i, name: `Only ${i + 1}`, club: i % 2 ? 2 : 1 }));
    // 22 Oct 2026 pairs Rapid picks with In Order.
    const day = draftDay("2026-10-22", { id: 1, name: "Chelsea" }, { id: 2, name: "Arsenal" }, shared, new Set(), { decoys, spells: new Map(), nowYear: 2026 });
    expect(day.part1.format).toBe("pick");
    expect(day.part1.answers).toHaveLength(8);
    for (const a of day.part1.answers) expect(a.choices).toContain(a.answer_text);
    expect(day.part2?.format).toBe("in_order");
  });
});

describe("pairingFor", () => {
  it("gives every week all four pairings, changing both parts day to day", () => {
    const week = ["2026-10-19", "2026-10-20", "2026-10-21", "2026-10-22", "2026-10-23", "2026-10-24", "2026-10-25"].map(pairingFor);
    expect(new Set(week.map((p) => `${p.rapid}-${p.era}`)).size).toBe(4);
    for (let i = 1; i < week.length; i++) expect(`${week[i].rapid}-${week[i].era}`).not.toBe(`${week[i - 1].rapid}-${week[i - 1].era}`);
  });

  it("falls back to Free Recall on a Rapid picks day without decoys", () => {
    const shared = Array.from({ length: 8 }, (_, i) => player(i + 1, `Both ${i + 1}`, [], `${1995 + i}-07-01`, `${1996 + i}-07-01`));
    const day = draftDay("2026-10-22", { id: 1, name: "Chelsea" }, { id: 2, name: "Arsenal" }, shared, new Set(), { decoys: [], spells: new Map(), nowYear: 2026 });
    expect(day.part1.format).toBe("free_recall");
  });
});
