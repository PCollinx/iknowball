import { describe, expect, it } from "vitest";
import { listToText, parseList, seasonOfDate } from "@/lib/curated/lists";
import { draftDay, type TemplateData } from "./day";
import {
  ageOn,
  captainsOf,
  captainYears,
  goldenBootPicks,
  goldenBootSeasons,
  goldenBootWinners,
  howOld,
  resultSeasons,
  seasonDecoys,
  titleSeasons,
  whereTheyFinished,
} from "./curated";

const TODAY = "2026-10-30";

const boots = parseList(
  "golden-boots",
  `2001/02 | Thierry Henry | Arsenal | 24
2002/03 | Ruud van Nistelrooy | Man United | 25
2003/04 | Thierry Henry | Arsenal | 30
2004/05 | Thierry Henry | Arsenal | 25
2005/06 | Thierry Henry | Arsenal | 27
2006/07 | Didier Drogba | Chelsea | 20
2007/08 | Cristiano Ronaldo | Man United | 31
2008/09 | Nicolas Anelka | Chelsea | 19
2009/10 | Didier Drogba | Chelsea | 29
2010/11 | Carlos Tevez | Man City | 20
2010/11 | Dimitar Berbatov | Man United | 20
2011/12 | Robin van Persie | Arsenal | 30
2012/13 | Robin van Persie | Man United | 26
2013/14 | Luis Suárez | Liverpool | 31`,
).rows;

const standings = parseList(
  "standings",
  `1997/98 | 1 | Arsenal
2001/02 | 1 | Arsenal
2003/04 | 1 | Arsenal
2004/05 | 1 | Chelsea
2005/06 | 1 | Chelsea
2006/07 | 1 | Man United
2015/16 | 1 | Leicester
${Array.from({ length: 20 }, (_, i) => `2025/26 | ${i + 1} | ${["Arsenal", "Man City", "Man United", "Aston Villa", "Liverpool", "Bournemouth", "Sunderland", "Brighton", "Brentford", "Chelsea", "Fulham", "Newcastle", "Everton", "Leeds", "Crystal Palace", "Nottingham Forest", "Spurs", "West Ham", "Burnley", "Wolves"][i]} | ${90 - i * 3}`).join("\n")}`,
).rows;

const captains = parseList(
  "captains",
  `Arsenal | Tony Adams | 1988–2002
Arsenal | Patrick Vieira | 2002–2005
Arsenal | Thierry Henry | 2005–2007
Arsenal | William Gallas | 2007–2008
Arsenal | Cesc Fàbregas | 2008–2011
Arsenal | Robin van Persie | 2011–2012
Arsenal | Granit Xhaka | 2019–2019
Arsenal | Martin Ødegaard | 2022–`,
).rows;

const results = parseList(
  "results",
  `2011-08-28 | Man United 8–2 Arsenal
2011-02-05 | Newcastle 4–4 Arsenal
2024-04-23 | Arsenal 5–0 Chelsea
2009-11-22 | Spurs 9–1 Wigan
1995-03-04 | Man United 9–0 Ipswich`,
).rows;

const moments = parseList(
  "moments",
  `Wayne Rooney | first PL goal | Everton | 2002-10-19 | 1985-10-24
Ethan Nwaneri | PL debut | Arsenal | 2022-09-18 | 2007-03-21
Jack Wilshere | PL debut | Arsenal | 2008-09-13 | 1992-01-01
Bukayo Saka | first PL goal | Arsenal | 2020-07-04 | 2001-09-05
Michael Owen | first PL goal | Liverpool | 1997-05-06 | 1979-12-14`,
).rows;

describe("lists", () => {
  it("reads each line and writes it back the same", () => {
    const text = "2011-08-28 | Man United 8–2 Arsenal\n2011-02-05 | Newcastle 4–4 Arsenal";
    expect(listToText("results", parseList("results", text).rows)).toBe(text);
    expect(listToText("captains", captains)).toContain("Arsenal | Martin Ødegaard | 2022–");
    expect(listToText("standings", standings)).toContain("1997/98 | 1 | Arsenal\n");
  });

  it("names the lines that don't read", () => {
    const { rows, errors } = parseList("golden-boots", "2004/06 | Thierry Henry | Arsenal | 25\n\n2004/05 | Henry | Arsenal\n2004/05 | Thierry Henry | Arsenal | 25");
    expect(rows).toHaveLength(1);
    expect(errors).toEqual(['Line 1: "2004/06" isn\'t a season like 2017/18.', "Line 3: needs season | player | club | goals."]);
    expect(parseList("captains", "Arsenal | Tony Adams | 2002–1988").errors).toEqual(["Line 1: 2002–1988 ends before it starts."]);
    expect(parseList("standings", "2025/26 | 1 | Arsenal\n2025/26 | 1 | Man City").errors).toEqual(["2025/26 1 is in twice."]);
  });

  it("puts a date in its season", () => {
    expect(seasonOfDate("2011-08-28")).toBe("2011/12");
    expect(seasonOfDate("2012-05-13")).toBe("2011/12");
  });
});

describe("build C templates", () => {
  const players = ["Ade Bolt", "Ben Cole", "Cal Dunn", "Dan Eze", "Eli Fox", "Fin Gray"].map((name, i) => ({ id: i + 1, name, aliases: [], joinedA: null, joinedB: null }));

  it("asks for Golden Boot winners from the first season that keeps the list short enough", () => {
    const found = goldenBootWinners(boots, TODAY)!;
    expect(found.since).toBeNull();
    expect(found.players.map((p) => p.name)).toContain("Thierry Henry");
    expect(new Set(found.players.map((p) => p.name)).size).toBe(found.players.length);
  });

  it("lists a club's captains since 1992, the one in post then included", () => {
    expect(captainsOf(captains, "Arsenal")!.map((p) => p.name)).toContain("Tony Adams");
    expect(captainsOf(captains, "Chelsea")).toBeNull();
  });

  it("asks Golden Boot seasons with one winner, none more than twice, the day's clubs first", () => {
    const lines = goldenBootPicks(boots, ["Arsenal", "Chelsea"], 3, TODAY);
    expect(lines.length).toBeGreaterThanOrEqual(5);
    expect(lines.some((l) => l.question === "2010/11")).toBe(false);
    expect(lines.filter((l) => l.answer === "Thierry Henry").length).toBeLessThanOrEqual(2);
    for (const l of lines) expect(l.wrong).not.toContain(l.answer);
    expect(goldenBootPicks(boots, ["Wolves", "Burnley"], 3, TODAY)).toEqual([]);
  });

  it("orders five clubs from the latest full table with the day's clubs in it", () => {
    const found = whereTheyFinished(standings, ["Spurs", "Chelsea"], 7, TODAY)!;
    expect(found.season).toBe("2025/26");
    expect(found.lines.map((l) => l.text)).toEqual(expect.arrayContaining(["Spurs", "Chelsea"]));
    expect(found.lines).toHaveLength(5);
    expect(found.lines.find((l) => l.text === "Chelsea")!.note).toBe("10th · 63 pts");
    expect(whereTheyFinished(standings, ["Ipswich", "Hull"], 7, TODAY)).toBeNull();
  });

  it("asks title seasons with no wrong option a season the club won", () => {
    const lines = titleSeasons(standings, ["Arsenal", "Spurs"], 2, TODAY);
    expect(lines.length).toBeGreaterThanOrEqual(4);
    const arsenal = lines.filter((l) => l.question!.startsWith("Arsenal"));
    expect(arsenal.length).toBeGreaterThan(0);
    for (const l of arsenal) expect(l.wrong.some((w) => ["1997/98", "2001/02", "2003/04"].includes(w))).toBe(false);
    expect(lines.map((l) => l.question)).toContain("Leicester's Premier League title");
    expect(titleSeasons(standings, ["Wolves", "Spurs"], 2, TODAY)).toEqual([]);
  });

  it("numbers a player's Golden Boots", () => {
    const lines = goldenBootSeasons(boots, ["Arsenal", "Chelsea"], 1, TODAY);
    expect(lines.length).toBeGreaterThanOrEqual(4);
    const henry = lines.find((l) => l.question!.startsWith("Thierry Henry"));
    if (henry) expect(henry.question).toMatch(/Thierry Henry's (1st|2nd|3rd|4th) Golden Boot/);
  });

  it("asks captains' years only for armbands handed over in the Premier League era", () => {
    const lines = captainYears(captains, ["Arsenal", "Chelsea"], 0, 2026);
    expect(lines.map((l) => l.question)).not.toContain("Tony Adams at Arsenal");
    expect(lines.map((l) => l.question)).not.toContain("Granit Xhaka at Arsenal");
    expect(lines.find((l) => l.question === "Patrick Vieira at Arsenal")?.answer).toBe("2002–2005");
  });

  it("asks the season of a famous result", () => {
    const lines = resultSeasons(results, ["Arsenal", "Chelsea"], 0, TODAY);
    expect(lines.find((l) => l.question === "Man United 8–2 Arsenal")?.answer).toBe("2011/12");
    expect(lines.slice(0, 3).every((l) => l.question!.includes("Arsenal"))).toBe(true);
    expect(resultSeasons(results, ["Wolves", "Burnley"], 0, TODAY)).toEqual([]);
  });

  it("works out ages on the day", () => {
    expect(ageOn("1985-10-24", "2002-10-19")).toBe(16);
    expect(ageOn("1985-10-24", "2002-10-24")).toBe(17);
    const lines = howOld(moments, ["Arsenal", "Chelsea"], 0);
    expect(lines.find((l) => l.question === "Ethan Nwaneri's PL debut at Arsenal")?.answer).toBe("15");
    for (const l of lines) expect(l.wrong.every((w) => Number(w) >= 14)).toBe(true);
  });

  it("keeps wrong seasons in the finished Premier League era", () => {
    expect(seasonDecoys("1992/93", new Set(), 0, TODAY)!.every((s) => s >= "1993/94")).toBe(true);
    expect(seasonDecoys("2025/26", new Set(), 0, TODAY)!.every((s) => s < "2025/26")).toBe(true);
  });

  it("drafts a day from the lists, marked as from them", () => {
    const more: TemplateData = {
      clubs: new Map(),
      spellsAt: new Map(),
      careers: new Map(),
      recentTemplates: new Set(),
      managers: [],
      famous: [],
      grounds: [],
      lists: { standings, goldenBoots: boots, captains, results, moments },
    };
    const parts = Array.from({ length: 30 }, (_, i) => draftDay(`2026-11-${String(i + 1).padStart(2, "0")}`, { id: 1, name: "Arsenal" }, { id: 2, name: "Chelsea" }, players, new Set(), { decoys: [], spells: new Map(), nowYear: 2026 }, more))
      .flatMap((d) => [d.part1, d.part2])
      .filter((p) => p && p.source);
    expect(new Set(parts.map((p) => p!.template))).toEqual(
      new Set(["golden-boot-winners", "captains", "golden-boot-picks", "where-they-finished", "title-season", "golden-boot-season", "captain-years", "famous-result", "how-old"]),
    );
  });

  it("rests Golden Boot winners after a go", () => {
    const more: TemplateData = {
      clubs: new Map(),
      spellsAt: new Map(),
      careers: new Map(),
      recentTemplates: new Set(),
      managers: [],
      famous: [],
      grounds: [],
      lists: { standings, goldenBoots: boots, captains: [], results, moments },
      restedTemplates: new Set(["golden-boot-winners"]),
    };
    const templates = Array.from({ length: 12 }, (_, i) => draftDay(`2026-11-${String(i + 1).padStart(2, "0")}`, { id: 1, name: "Wolves" }, { id: 2, name: "Burnley" }, players, new Set(), undefined, more).part1.template);
    expect(templates).not.toContain("golden-boot-winners");
  });
});
