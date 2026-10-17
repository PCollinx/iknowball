import { describe, expect, it } from "vitest";
import { clubInTitle, type Club } from "./club";

const spurs: Club = {
  id: 1,
  name: "Spurs",
  short_name: "TOT",
  shirt_colour: "#FFFFFF",
  number_colour: "#132257",
  trim_colour: "#132257",
  kit_pattern: "plain",
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
