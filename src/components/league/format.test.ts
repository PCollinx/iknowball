import { describe, expect, it } from "vitest";
import { weekDay, weekLabel } from "./format";

describe("weekLabel", () => {
  it("names the month once inside a month and twice across one", () => {
    expect(weekLabel({ startsOn: "2026-10-12", endsOn: "2026-10-18" })).toBe("Mon 12 to Sun 18 Oct");
    expect(weekLabel({ startsOn: "2026-10-26", endsOn: "2026-11-01" })).toBe("Mon 26 Oct to Sun 1 Nov");
  });
});

describe("weekDay", () => {
  it("counts from Monday", () => {
    expect(weekDay({ startsOn: "2026-10-19", today: "2026-10-19" })).toBe(0);
    expect(weekDay({ startsOn: "2026-10-19", today: "2026-10-25" })).toBe(6);
  });
});
