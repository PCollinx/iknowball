import { describe, expect, it } from "vitest";
import { cleanCode, newLeagueCode, weekLabel } from "./format";

describe("weekLabel", () => {
  it("names the month once inside a month and twice across one", () => {
    expect(weekLabel({ startsOn: "2026-10-12", endsOn: "2026-10-18" })).toBe("Mon 12 to Sun 18 Oct");
    expect(weekLabel({ startsOn: "2026-10-26", endsOn: "2026-11-01" })).toBe("Mon 26 Oct to Sun 1 Nov");
  });
});

describe("league codes", () => {
  it("start with IKB and stay 6 characters", () => {
    const code = newLeagueCode();
    expect(code).toMatch(/^IKB[A-Z2-9]{3}$/);
  });
  it("read back however they're typed", () => {
    expect(cleanCode("IKB7QX")).toBe("IKB7QX");
    expect(cleanCode(" ikb-7qx ")).toBe("IKB7QX");
    expect(cleanCode("ikb 7qx")).toBe("IKB7QX");
    expect(cleanCode("7qx")).toBe("IKB7QX");
    expect(cleanCode("k7q2xy")).toBe("K7Q2XY");
  });
});
