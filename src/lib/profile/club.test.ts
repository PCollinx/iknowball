import { describe, expect, it } from "vitest";
import { clubInTitle, fixtureKit, type Club } from "./club";

const spurs: Club = {
  id: 1,
  name: "Spurs",
  short_name: "TOT",
  shirt_colour: "#FFFFFF",
  number_colour: "#132257",
  trim_colour: "#132257",
  kit_pattern: "plain",
  kit_collar: "crew",
  in_premier_league: true,
};

describe("clubInTitle", () => {
  it("finds the club on either side of the fixture", () => {
    expect(clubInTitle(spurs, "Spurs v Arsenal")).toBe(true);
    expect(clubInTitle(spurs, "Arsenal v Spurs")).toBe(true);
  });

  it("needs the whole name, not part of it", () => {
    expect(clubInTitle(spurs, "Arsenal v Chelsea")).toBe(false);
    expect(clubInTitle({ ...spurs, name: "Man City" }, "Man United v Chelsea")).toBe(false);
  });

  it("is false for neutrals", () => {
    expect(clubInTitle(null, "Spurs v Arsenal")).toBe(false);
  });
});

describe("fixtureKit", () => {
  const arsenal: Club = { ...spurs, id: 2, name: "Arsenal", shirt_colour: "#EF0107", kit_pattern: "sleeves" };

  it("goes half and half when both clubs are known", () => {
    const kit = fixtureKit(spurs, arsenal)!;
    expect(kit.shirt).toBe("#FFFFFF");
    expect(kit.half?.shirt).toBe("#EF0107");
  });

  it("falls back to one club, then to none", () => {
    expect(fixtureKit(null, arsenal)?.shirt).toBe("#EF0107");
    expect(fixtureKit(null, null)).toBeNull();
  });
});
