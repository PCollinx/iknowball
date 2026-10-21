import { describe, expect, it } from "vitest";
import { sectionOf } from "./NavLinks";

describe("sectionOf", () => {
  it("marks the section an address belongs to", () => {
    expect(sectionOf("/daily")).toBe("daily");
    expect(sectionOf("/clash/K7Q2XM")).toBe("clash");
    expect(sectionOf("/league/everyone")).toBe("league");
    expect(sectionOf("/profile")).toBe("profile");
  });

  it("treats today's table as its own section, not the Daily", () => {
    expect(sectionOf("/daily/table")).toBe("table");
  });

  it("marks nothing on home, privacy or a near miss", () => {
    expect(sectionOf("/")).toBeNull();
    expect(sectionOf("/privacy")).toBeNull();
    expect(sectionOf("/dailyx")).toBeNull();
  });
});
