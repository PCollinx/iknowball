import { describe, expect, it } from "vitest";
import { APP_ICON_SRC, LOGO_SRC } from "./logo";

const svgOf = (src: string) => Buffer.from(src.replace("data:image/svg+xml;base64,", ""), "base64").toString();

describe("logo", () => {
  it("is drawn in outlines, so it needs no font wherever it's shown", () => {
    for (const src of [LOGO_SRC, APP_ICON_SRC]) {
      const svg = svgOf(src);
      expect(svg.startsWith("<svg")).toBe(true);
      expect(svg).not.toContain("<text");
      expect(svg).toContain("clip-path=\"url(#ikb)\"");
    }
  });

  it("keeps royal blue out of the mark", () => {
    expect(svgOf(LOGO_SRC).toLowerCase()).not.toContain("#2440ff");
  });
});
