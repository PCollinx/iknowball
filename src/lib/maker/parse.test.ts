import { describe, expect, it } from "vitest";
import { orderIssues, orderToText, parseOrder, parsePicks, parseRecall, pickIssues, picksToText, recallIssues, recallToText, shownChoices } from "./parse";

describe("parseRecall", () => {
  it("reads names and comma-separated aliases, skipping blank lines", () => {
    expect(parseRecall("Cesc Fàbregas | Cesc, Fabregas\n\n  Willian  \n")).toEqual([
      { text: "Cesc Fàbregas", aliases: ["Cesc", "Fabregas"] },
      { text: "Willian", aliases: [] },
    ]);
  });

  it("round-trips through recallToText", () => {
    const text = "Kepa Arrizabalaga | Kepa\nJorginho";
    const lines = parseRecall(text).map((l) => ({ answer_text: l.text, extra_aliases: l.aliases }));
    expect(recallToText(lines)).toBe(text);
  });
});

describe("parseOrder", () => {
  it("keeps the order and the reveal note", () => {
    const parsed = parseOrder("Emmanuel Petit | 2001\nAshley Cole");
    expect(parsed).toEqual([
      { text: "Emmanuel Petit", note: "2001" },
      { text: "Ashley Cole", note: null },
    ]);
    expect(orderToText(parsed.map((p) => ({ answer_text: p.text, reveal_note: p.note })))).toBe("Emmanuel Petit | 2001\nAshley Cole");
  });
});

describe("recallIssues", () => {
  it("flags a key that two answers share", () => {
    const { errors } = recallIssues(parseRecall("Ronaldo\nCristiano Ronaldo | Ronaldo"));
    expect(errors.some((e) => e.includes('"ronaldo" would count for both'))).toBe(true);
  });

  it("rejects an alias that is a surname two answers share", () => {
    const { errors } = recallIssues(parseRecall("Ashley Cole | Cole\nJoe Cole"));
    expect(errors[0]).toContain('The alias "cole" gives Ashley Cole');
  });

  it("warns when a shared surname only counts as a full name", () => {
    const { errors, warnings } = recallIssues(parseRecall("Ashley Cole\nJoe Cole"));
    expect(errors).toEqual([]);
    expect(warnings[0]).toContain("Ashley Cole and Joe Cole");
  });

  it("needs at least one answer and letters to match on", () => {
    expect(recallIssues([]).errors).toContain("Add at least one answer.");
    expect(recallIssues(parseRecall("!!!")).errors[0]).toContain("no letters");
  });
});

describe("orderIssues", () => {
  it("needs two answers and no repeats", () => {
    expect(orderIssues(parseOrder("Petit")).errors).toContain("In Order needs at least two answers.");
    expect(orderIssues(parseOrder("Petit\npetit")).errors[0]).toContain("twice");
  });
});

describe("picks", () => {
  it("reads questions, right option first, and writes them back", () => {
    const lines = parsePicks("Ashley Cole | Thierry Henry | Frank Lampard\nHenry at Arsenal :: 1999–2007 | 1995–2003 | 2003–2011");
    expect(lines).toEqual([
      { question: null, answer: "Ashley Cole", wrong: ["Thierry Henry", "Frank Lampard"] },
      { question: "Henry at Arsenal", answer: "1999–2007", wrong: ["1995–2003", "2003–2011"] },
    ]);
    const saved = lines.map((l) => ({ question: l.question, answer_text: l.answer, choices: shownChoices(l) }));
    expect(parsePicks(picksToText(saved))).toEqual(lines);
  });

  it("puts the right option somewhere among the choices, the same each time", () => {
    const line = { question: null, answer: "Ashley Cole", wrong: ["A", "B", "C"] };
    expect(shownChoices(line)).toEqual(shownChoices(line));
    expect([...shownChoices(line)].sort()).toEqual(["A", "Ashley Cole", "B", "C"]);
  });

  it("flags unplayable questions", () => {
    expect(pickIssues(parsePicks("Only one"), "pick").errors).toHaveLength(1);
    expect(pickIssues(parsePicks("A | A | B"), "pick").errors).toHaveLength(1);
    expect(pickIssues(parsePicks("1999–2007 | 1995–2003"), "era").errors).toHaveLength(1);
    expect(pickIssues(parsePicks("Henry at Arsenal :: 1999–2007 | 1995–2003"), "era").errors).toEqual([]);
  });
});
