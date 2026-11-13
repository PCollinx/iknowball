import { describe, expect, it } from "vitest";
import { afterRight, ECHO, MOMENTS, NEW_BANTER, POOL, sayBack, wrongLine, type Banter } from "./banter";

const mid = { found: 3, answers: 8, left: 90 };
const noEcho = () => 0.99;

describe("wrongLine", () => {
  it("never repeats a pool line until all have shown", () => {
    let b: Banter = NEW_BANTER;
    const seen: string[] = [];
    for (let i = 0; i < POOL.length; i++) {
      const r = wrongLine(afterRight(b), "x", mid, Math.random);
      seen.push(r.text);
      b = r.next;
    }
    expect(new Set(seen).size).toBe(POOL.length);
    expect(b.bag).toEqual([]);
  });

  it("says the guess back, tidied, about one in four", () => {
    const r = wrongLine(NEW_BANTER, "  wayne   ROONEY ", mid, () => 0.1);
    expect(r.text).toContain("Wayne Rooney");
    expect(ECHO.map((l) => l.replace("{g}", "Wayne Rooney"))).toContain(r.text);
  });

  it("doesn't say back a name too long", () => {
    expect(sayBack("a")).toBeNull();
    expect(sayBack("Pierre-Emerick Aubameyang")).toBeNull();
    expect(sayBack("o'shea")).toBe("O'Shea");
  });

  it("marks the third and fifth miss running, once each", () => {
    let b: Banter = NEW_BANTER;
    const lines: string[] = [];
    for (let i = 0; i < 6; i++) {
      const r = wrongLine(b, "x", mid, noEcho);
      lines.push(r.text);
      b = r.next;
    }
    expect(MOMENTS.streak3).toContain(lines[2]);
    expect(MOMENTS.streak5).toContain(lines[4]);
    expect(POOL).toContain(lines[3]);
    expect(POOL).toContain(lines[5]);
  });

  it("a right name resets the run", () => {
    let b: Banter = { ...NEW_BANTER, streak: 2, misses: 2 };
    b = afterRight(b);
    expect(POOL).toContain(wrongLine(b, "x", mid, noEcho).text);
  });

  it("knows the last 15 seconds, nil and one to go", () => {
    expect(MOMENTS.late).toContain(wrongLine(NEW_BANTER, "x", { ...mid, left: 12 }, noEcho).text);
    const once = wrongLine(NEW_BANTER, "x", { found: 0, answers: 8, left: 90 }, noEcho);
    expect(POOL).toContain(once.text);
    expect(MOMENTS.nil).toContain(wrongLine(afterRight(once.next), "x", { found: 0, answers: 8, left: 90 }, noEcho).text);
    expect(MOMENTS.close).toContain(wrongLine(NEW_BANTER, "x", { found: 7, answers: 8, left: 90 }, noEcho).text);
  });

  it("shows a moment only once a try", () => {
    const at = { ...mid, left: 10 };
    const first = wrongLine(NEW_BANTER, "x", at, noEcho);
    expect(POOL).toContain(wrongLine(afterRight(first.next), "x", at, noEcho).text);
  });
});
