import { describe, expect, it } from "vitest";
import { askCopy, doneCopy, forcedAsk, whatToAsk } from "./ask";

describe("whatToAsk", () => {
  it("asks a phone in the browser to save it first, whatever the whistle", () => {
    expect(whatToAsk({ phone: true, way: "prompt", whistle: "off" })).toBe("install");
    expect(whatToAsk({ phone: true, way: "prompt", whistle: "on" })).toBe("install");
    expect(whatToAsk({ phone: true, way: "ios", whistle: "install" })).toBe("ios");
  });

  it("asks nothing on a phone browser that can't install", () => {
    expect(whatToAsk({ phone: true, way: "none", whistle: "off" })).toBeNull();
  });

  it("asks for the whistle from the home screen, only while it's off", () => {
    expect(whatToAsk({ phone: true, way: "installed", whistle: "off" })).toBe("whistle");
    expect(whatToAsk({ phone: true, way: "installed", whistle: "on" })).toBeNull();
    expect(whatToAsk({ phone: true, way: "installed", whistle: "blocked" })).toBeNull();
  });

  it("goes straight to the whistle on a laptop, even where it could install", () => {
    expect(whatToAsk({ phone: false, way: "prompt", whistle: "off" })).toBe("whistle");
    expect(whatToAsk({ phone: false, way: "none", whistle: "unsupported" })).toBeNull();
  });

  it("waits while the browser is still being read", () => {
    expect(whatToAsk({ phone: true, way: null, whistle: "off" })).toBe("wait");
    expect(whatToAsk({ phone: false, way: "none", whistle: "loading" })).toBe("wait");
  });
});

describe("askCopy", () => {
  it("sells the challenge buzz after Clash, with the score", () => {
    expect(askCopy("whistle", "clash", 14).line).toContain("takes on your 14");
    expect(askCopy("install", "clash", 0).line).toContain("takes on your score");
  });

  it("puts the home screen on and the browser tab off for the phone ask", () => {
    const c = askCopy("ios", "daily", 65);
    expect([c.on, c.off, c.button]).toEqual(["Home screen", "Browser tab", "Got it"]);
    expect(askCopy("install", "daily", 65).button).toBe("Add to home screen");
  });

  it("says what happens next once it's done", () => {
    expect(doneCopy("install", "daily").title).toBe("Saved on your phone");
    expect(doneCopy("whistle", "clash").line).toContain("when a mate plays");
  });
});

describe("forcedAsk", () => {
  it("shows the asked-for pop-up on a test site", () => {
    expect(forcedAsk("?ask=whistle", false)).toBe("whistle");
    expect(forcedAsk("?t=abc&ask=ios", false)).toBe("ios");
    expect(forcedAsk("?ask=install", false)).toBe("install");
  });

  it("ignores anything else, and everything on the live site", () => {
    expect(forcedAsk("?ask=phone", false)).toBeNull();
    expect(forcedAsk("", false)).toBeNull();
    expect(forcedAsk("?ask=whistle", true)).toBeNull();
  });
});
