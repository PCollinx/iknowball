import { describe, expect, it } from "vitest";
import { clock, duration } from "./clock";

describe("clock and duration", () => {
  it("keeps the clock as m:ss", () => {
    expect(clock(238)).toBe("3:58");
    expect(clock(5)).toBe("0:05");
  });

  it("gives time used its units", () => {
    expect(duration(238)).toBe("3m 58s");
    expect(duration(45)).toBe("45s");
    expect(duration(0)).toBe("0s");
    expect(duration(240)).toBe("4m");
  });
});
