import { describe, expect, it } from "vitest";
import { askCopy, doneCopy, forcedAsk, stepOf, whatToAsk } from "./ask";

describe("whatToAsk", () => {
  it("asks a phone in the browser to save it first, whatever the whistle", () => {
    expect(whatToAsk({ guest: false, phone: true, way: "prompt", whistle: "off" })).toBe("install");
    expect(whatToAsk({ guest: false, phone: true, way: "prompt", whistle: "on" })).toBe("install");
    expect(whatToAsk({ guest: false, phone: true, way: "ios", whistle: "install" })).toBe("ios");
  });

  it("asks nothing on a phone browser that can't install", () => {
    expect(whatToAsk({ guest: false, phone: true, way: "none", whistle: "off" })).toBeNull();
  });

  it("asks for the whistle from the home screen, only while it's off", () => {
    expect(whatToAsk({ guest: false, phone: true, way: "installed", whistle: "off" })).toBe("whistle");
    expect(whatToAsk({ guest: false, phone: true, way: "installed", whistle: "on" })).toBeNull();
    expect(whatToAsk({ guest: false, phone: true, way: "installed", whistle: "blocked" })).toBeNull();
  });

  it("goes straight to the whistle on a laptop, even where it could install", () => {
    expect(whatToAsk({ guest: false, phone: false, way: "prompt", whistle: "off" })).toBe("whistle");
    expect(whatToAsk({ guest: false, phone: false, way: "none", whistle: "unsupported" })).toBeNull();
  });

  it("waits while the browser is still being read", () => {
    expect(whatToAsk({ guest: false, phone: true, way: null, whistle: "off" })).toBe("wait");
    expect(whatToAsk({ guest: false, phone: false, way: "none", whistle: "loading" })).toBe("wait");
  });
});

describe("the guest's shirt", () => {
  it("asks a guest to save their shirt first, on any device and before the browser is read", () => {
    expect(whatToAsk({ guest: true, phone: true, way: "prompt", whistle: "off" })).toBe("shirt");
    expect(whatToAsk({ guest: true, phone: false, way: null, whistle: "loading" })).toBe("shirt");
    expect(whatToAsk({ guest: true, phone: true, way: "installed", whistle: "on" })).toBe("shirt");
  });

  it("says what saving keeps, and where the score lives now", () => {
    const daily = askCopy("shirt", "daily", 65, true);
    expect([daily.on, daily.off, daily.title]).toEqual(["Your shirt", "Guest", "Save your shirt"]);
    expect(daily.line).toBe("Your 65 is only on this phone for now. Save your shirt and keep:");
    expect(daily.keeps?.[0]).toBe("Your 65 and your streak");
    const clash = askCopy("shirt", "clash", 0, false);
    expect(clash.line).toBe("What you've played is only on this browser for now. Save your shirt and keep:");
    expect(clash.keeps).toContain("The challenges you've sent");
  });

  it("remembers Not now per step", () => {
    expect(["shirt", "install", "ios", "whistle"].map((a) => stepOf(a as Parameters<typeof stepOf>[0]))).toEqual(["shirt", "phone", "phone", "whistle"]);
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
    expect(forcedAsk("?ask=shirt", false)).toBe("shirt");
  });

  it("ignores anything else, and everything on the live site", () => {
    expect(forcedAsk("?ask=phone", false)).toBeNull();
    expect(forcedAsk("", false)).toBeNull();
    expect(forcedAsk("?ask=whistle", true)).toBeNull();
  });
});
