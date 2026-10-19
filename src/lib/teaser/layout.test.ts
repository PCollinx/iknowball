import { describe, expect, it } from "vitest";
import { fitSize, linesAt, parseTeaser, shirtGrid, shirtLabels, teaserQuery, withHeadline } from "./layout";
import { shirtSvg } from "@/lib/og/shirt-svg";

describe("parseTeaser", () => {
  it("falls back to safe defaults", () => {
    const t = parseTeaser({});
    expect(t).toMatchObject({ format: "wide", kind: "recall", no: 1, count: 6, names: [], home: null });
  });

  it("clamps the shirt count and takes it from the names when given", () => {
    expect(parseTeaser({ count: "40" }).count).toBe(12);
    expect(parseTeaser({ count: "0" }).count).toBe(2);
    expect(parseTeaser({ count: "9", names: "Sol Campbell\n\nWilliam Gallas\r\nPat Jennings" }).count).toBe(3);
  });

  it("round-trips through its query string", () => {
    const t = parseTeaser({ format: "tall", kind: "order", no: "4", home: "1", away: "18", names: "A One\nB Two", dare: "Go on" });
    expect(parseTeaser(Object.fromEntries(new URLSearchParams(teaserQuery(t))))).toEqual(t);
  });
});

describe("shirtLabels", () => {
  it("numbers recall shirts and hides names until the reveal", () => {
    expect(shirtLabels(parseTeaser({ count: "2" }))).toEqual([
      { big: "1", plate: "?" },
      { big: "2", plate: "?" },
    ]);
    expect(shirtLabels(parseTeaser({ names: "Sol Campbell\nRonaldinho" })).map((l) => l.plate)).toEqual(["Campbell", "Ronaldinho"]);
  });

  it("letters the shirts to put in order", () => {
    expect(shirtLabels(parseTeaser({ kind: "order", names: "Sol Campbell\nPat Jennings" }))).toEqual([
      { big: "A", plate: "Campbell" },
      { big: "B", plate: "Jennings" },
    ]);
  });
});

describe("withHeadline", () => {
  it("uses the clubs when the headline is blank", () => {
    expect(withHeadline(parseTeaser({}), ["Arsenal", "Spurs"]).headline).toBe("Arsenal and Spurs");
    expect(withHeadline(parseTeaser({ headline: "Derby day" }), ["Arsenal"]).headline).toBe("Derby day");
  });
});

describe("type and grid sizing", () => {
  it("shrinks a headline until it fits the lines allowed", () => {
    const size = fitSize("North London crossings", 700, 150, 64, 3);
    expect(linesAt("North London crossings", size, 700)).toBeLessThanOrEqual(3);
    expect(fitSize("Arsenal", 700, 150, 64, 2)).toBe(150);
  });

  it("picks the columns that give the biggest shirts", () => {
    expect(shirtGrid(9, 660, 620, 22).cols).toBe(3);
    expect(shirtGrid(4, 660, 620, 22).cols).toBe(2);
    expect(shirtGrid(9, 968, 570, 18).cols).toBe(5);
  });
});

describe("shirtSvg", () => {
  it("draws the kit's pattern as a standalone SVG", () => {
    const uri = shirtSvg({ shirt: "#DA291C", number: "#FFFFFF", trim: "#FFFFFF", pattern: "stripes", collar: "polo" });
    const svg = Buffer.from(uri.split(",")[1], "base64").toString();
    expect(svg).toMatch(/^<svg xmlns="http:\/\/www.w3.org\/2000\/svg" viewBox="0 0 100 104"/);
    expect(svg).toContain('clip-path="url(#s)"');
    expect(svg.match(/<rect x="23"/g)).toHaveLength(1);
    expect(svg).not.toContain("var(");
  });
});
