import { describe, expect, it } from "vitest";
import { headlineFixture } from "./fixture";

describe("headlineFixture", () => {
  it("keeps short fixtures as they are", () => {
    expect(headlineFixture("Chelsea v Arsenal")).toBe("Chelsea v Arsenal");
    expect(headlineFixture("Man City v Spurs")).toBe("Man City v Spurs");
  });

  it("uses fans' names for long fixtures", () => {
    expect(headlineFixture("Nottingham Forest v Wolverhampton Wanderers")).toBe("Forest v Wolves");
    expect(headlineFixture("Bournemouth v Crystal Palace")).toBe("Bournemouth v Palace");
  });

  it("leaves names it doesn't know", () => {
    expect(headlineFixture("Bournemouth v Some Very Long Town FC")).toBe("Bournemouth v Some Very Long Town FC");
  });
});
