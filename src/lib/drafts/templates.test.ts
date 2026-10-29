import { describe, expect, it } from "vitest";
import { draftDay, templateOrder, TEMPLATES, type TemplateData } from "./day";
import type { SharedPlayer } from "./generate";
import { allThereTogether, careerClubs, careerPathOrder, careerPathPicks, dressingRoom, isLoan, moves, oldestFirst, straightSwap, yearOfMove, type CareerSpell, type ClubSpell } from "./templates";

const ARS = { id: 1, name: "Arsenal" };
const CHE = { id: 2, name: "Chelsea" };
const TOT = { id: 3, name: "Spurs" };
const MCI = { id: 4, name: "Man City" };
const clubs = new Map([ARS, CHE, TOT, MCI].map((c) => [c.id, c]));

const spell = (club: number, from: number, to: number | null, loan = false): CareerSpell => ({
  club,
  joined: `${from}-07-01`,
  left: to === null ? null : `${to}-06-30`,
  loan,
});
const at = (id: number, name: string, from: number, to: number | null, extra: Partial<ClubSpell> = {}): ClubSpell => ({
  id,
  name,
  aliases: [],
  fame: 50,
  dob: null,
  joined: `${from}-07-01`,
  left: to === null ? null : `${to}-06-30`,
  loan: false,
  ...extra,
});
const shared = (id: number, name: string, fame = 50): SharedPlayer => ({ id, name, aliases: [], joinedA: null, joinedB: null, fame });

describe("loans and moves", () => {
  it("treats a marked loan, or a short spell inside a longer one elsewhere, as a loan", () => {
    const parent = spell(CHE.id, 2004, 2010);
    const inside = spell(TOT.id, 2006, 2007);
    expect(isLoan(inside, [parent, inside])).toBe(true);
    expect(isLoan(spell(TOT.id, 2011, 2012, true), [spell(TOT.id, 2011, 2012, true)])).toBe(true);
    expect(isLoan(parent, [parent, inside])).toBe(false);
  });

  it("finds straight moves and skips loans in between", () => {
    const career = [spell(ARS.id, 1999, 2006), spell(TOT.id, 2001, 2002), spell(CHE.id, 2006, 2014), spell(MCI.id, 2016, 2017)];
    expect(moves(career)).toEqual([{ from: ARS.id, to: CHE.id, year: 2006 }]);
  });
});

describe("dressingRoom", () => {
  it("lists everyone who overlapped a star by a season or more", () => {
    const star = at(1, "Kanu", 1999, 2004, { fame: 90 });
    const mates = Array.from({ length: 7 }, (_, i) => at(10 + i, `Mate ${i}`, 2000 + (i % 3), 2003 + (i % 3), { fame: 5 }));
    const brief = at(30, "Brief", 2004, 2005, { fame: 5 });
    const later = at(31, "Later", 2010, 2012, { fame: 5 });
    const room = dressingRoom([star, ...mates, brief, later], new Set(), 0, "2026-10-30");
    expect(room?.player.name).toBe("Kanu");
    expect(room?.teammates.map((t) => t.name).sort()).toEqual(mates.map((m) => m.name).sort());
  });
});

describe("straightSwap", () => {
  it("asks for the straight movers, with stopovers and one-club players as wrong options", () => {
    const direct = Array.from({ length: 6 }, (_, i) => shared(i + 1, `Direct ${i + 1}`));
    const via = Array.from({ length: 6 }, (_, i) => shared(20 + i, `Via ${i + 1}`));
    const careers = new Map<number, CareerSpell[]>([
      ...direct.map((p, i) => [p.id, i % 2 ? [spell(ARS.id, 2000, 2005), spell(CHE.id, 2005, 2009)] : [spell(CHE.id, 2000, 2004), spell(ARS.id, 2005, 2009)]] as [number, CareerSpell[]]),
      ...via.map((p) => [p.id, [spell(ARS.id, 2000, 2004), spell(MCI.id, 2004, 2008), spell(CHE.id, 2008, 2010)]] as [number, CareerSpell[]]),
    ]);
    const decoys = Array.from({ length: 20 }, (_, i) => ({ name: `Only ${i + 1}`, fame: 10 }));
    const lines = straightSwap([...direct, ...via], careers, decoys, ARS, CHE, new Set(), 0);
    expect(lines.length).toBe(6);
    for (const l of lines) {
      expect(l.answer).toMatch(/^Direct/);
      expect(l.wrong.every((w) => !w.startsWith("Direct"))).toBe(true);
    }
  });
});

describe("oldestFirst", () => {
  it("orders five players born in years spread apart, oldest first", () => {
    const squad = Array.from({ length: 12 }, (_, i) => at(i + 1, `Player ${i + 1}`, 1995 + i, 2000 + i, { dob: `${1970 + 2 * i}-03-01` }));
    const lines = oldestFirst(squad, new Set(), 0);
    expect(lines).toHaveLength(5);
    const years = lines.map((l) => Number(l.note));
    expect([...years].sort()).toEqual(years);
  });
});

describe("yearOfMove", () => {
  it("asks the year of a move to or from the day's club", () => {
    const players = Array.from({ length: 6 }, (_, i) => ({ id: i + 1, name: `Mover ${i + 1}`, fame: 50 }));
    const careers = new Map(players.map((p, i) => [p.id, [spell(ARS.id, 1996 + 2 * i, 2000 + 2 * i), spell(TOT.id, 2000 + 2 * i, 2004 + 2 * i)]]));
    const lines = yearOfMove(players, careers, clubs, [ARS, CHE], new Set(), 0, 2026);
    expect(lines.length).toBeGreaterThanOrEqual(4);
    const first = lines.find((l) => l.question === "Mover 1 at Arsenal → Spurs");
    expect(first?.answer).toBe("2000");
    for (const l of lines) expect(l.wrong.every((w) => /^\d{4}$/.test(w))).toBe(true);
  });
});

describe("allThereTogether", () => {
  it("asks when three stars overlapped, at least two seasons", () => {
    const squad = Array.from({ length: 15 }, (_, i) => at(i + 1, `First Star${i + 1}`, 1993 + i, 1999 + i, { fame: 100 - i }));
    const lines = allThereTogether(squad, ARS, new Set(), 0, 2026);
    expect(lines.length).toBeGreaterThanOrEqual(4);
    for (const l of lines) {
      expect(l.question).toMatch(/^Star\d+, Star\d+ and Star\d+ at Arsenal$/);
      const [from, to] = l.answer.split("–").map(Number);
      expect(to - from).toBeGreaterThanOrEqual(2);
    }
  });
});

describe("career paths", () => {
  const BAR = { id: 5, name: "Barcelona" };
  const RMA = { id: 6, name: "Real Madrid" };
  const WBA = { id: 7, name: "West Brom" };
  const all = new Map([ARS, CHE, TOT, MCI, BAR, RMA, WBA].map((c) => [c.id, c]));

  it("lists a career's clubs once per stay, loans left out", () => {
    const career = [spell(ARS.id, 2003, 2011), spell(BAR.id, 2011, 2014), spell(CHE.id, 2014, 2019), spell(TOT.id, 2015, 2016)];
    expect(careerClubs(career)).toEqual([
      { club: ARS.id, year: 2003 },
      { club: BAR.id, year: 2011 },
      { club: CHE.id, year: 2014 },
    ]);
  });

  it("asks whose path it is, never with a wrong option who took the same path", () => {
    const paths: number[][] = [
      [ARS.id, BAR.id, CHE.id],
      [ARS.id, TOT.id, MCI.id],
      [CHE.id, RMA.id, WBA.id],
      [BAR.id, ARS.id, TOT.id],
      [MCI.id, CHE.id, ARS.id],
      [ARS.id, RMA.id, MCI.id],
      [CHE.id, BAR.id, TOT.id],
      [ARS.id, MCI.id, BAR.id, CHE.id],
    ];
    // Every question needs four different names, so a round of five needs a squad of 20 or more.
    const clubIds = [TOT.id, MCI.id, BAR.id, RMA.id, WBA.id];
    for (let i = 0; paths.length < 28; i++) paths.push([i % 2 ? ARS.id : CHE.id, clubIds[i % 5], clubIds[(i + 2) % 5]]);
    const players = paths.map((_, i) => ({ id: i + 1, name: `Player ${i + 1}`, fame: 50 - i }));
    const careers = new Map(paths.map((p, i) => [i + 1, p.map((club, k) => spell(club, 2000 + 3 * k, 2003 + 3 * k))]));
    const lines = careerPathPicks(players, careers, all, [ARS, CHE], new Set(), 0);
    expect(lines.length).toBeGreaterThanOrEqual(5);
    const one = lines.find((l) => l.answer === "Player 1");
    // Player 8 went Arsenal, Man City, Barcelona, Chelsea: the same path with a stop, so never a wrong option for Player 1.
    if (one) expect(one.wrong).not.toContain("Player 8");
    for (const l of lines) expect(l.question).toMatch(/^[A-Za-z ]+( → [A-Za-z ]+){2,4}$/);
  });

  it("orders a player's clubs by the year he joined, keeping the day's club", () => {
    const career = [ARS.id, RMA.id, MCI.id, CHE.id, WBA.id].map((club, k) => spell(club, [1997, 1999, 2002, 2008, 2013][k], [1999, 2002, 2005, 2012, 2014][k]));
    const path = careerPathOrder([{ id: 1, name: "Nicolas Anelka", fame: 80 }], new Map([[1, career]]), all, [ARS, CHE], new Set(), 0);
    expect(path?.player).toBe("Nicolas Anelka");
    expect(path?.lines).toEqual([
      { text: "Arsenal", note: "1997" },
      { text: "Real Madrid", note: "1999" },
      { text: "Man City", note: "2002" },
      { text: "Chelsea", note: "2008" },
      { text: "West Brom", note: "2013" },
    ]);
  });
});

describe("templateOrder", () => {
  it("turns by date and puts recently used templates last", () => {
    const a = templateOrder(TEMPLATES.era, "2026-11-02", new Set());
    const b = templateOrder(TEMPLATES.era, "2026-11-03", new Set());
    expect(a[0]).not.toBe(b[0]);
    expect(templateOrder(TEMPLATES.era, "2026-11-02", new Set([a[0]])).at(-1)).toBe(a[0]);
  });
});

describe("draftDay with templates", () => {
  it("records the template and falls back to played-for-both", () => {
    const players = Array.from({ length: 8 }, (_, i) => ({ ...shared(i + 1, `Both ${i + 1}`), joinedA: `${1995 + i}-07-01`, joinedB: `${1996 + i}-07-01` }));
    const more: TemplateData = { clubs, spellsAt: new Map(), careers: new Map(), recentTemplates: new Set() };
    // 2026-10-25 pairs Free Recall with In Order.
    const day = draftDay("2026-10-25", ARS, CHE, players, new Set(), { decoys: [], spells: new Map(), nowYear: 2026 }, more);
    expect(day.part1.template).toBe("played-for-both");
    expect(day.part2?.template).toBe("joined-first");
  });
});
