import { describe, expect, it } from "vitest";
import { betaPass, gated, waitlistUp } from "./waitlist";

describe("waitlistUp", () => {
  it("runs from midnight WAT on 1 Nov to midnight WAT on 20 Nov", () => {
    expect(waitlistUp(new Date("2026-10-31T22:59:59Z"))).toBe(false);
    expect(waitlistUp(new Date("2026-10-31T23:00:00Z"))).toBe(true);
    expect(waitlistUp(new Date("2026-11-19T22:59:59Z"))).toBe(true);
    expect(waitlistUp(new Date("2026-11-19T23:00:00Z"))).toBe(false);
  });
});

describe("gated", () => {
  it("covers the games' screens", () => {
    for (const p of ["/", "/daily", "/daily/table", "/clash", "/clash/GH39HV", "/league", "/league/IKB7QX", "/profile"]) expect(gated(p)).toBe(true);
  });
  it("leaves the rest open", () => {
    for (const p of ["/privacy", "/waitlist", "/beta/abc", "/auth/callback", "/maker", "/daily/card", "/clash/GH39HV/card", "/league/everyone/card", "/dailyx"])
      expect(gated(p)).toBe(false);
  });
});

describe("betaPass", () => {
  it("needs the cookie to match a code of 8+ characters", () => {
    expect(betaPass("matchday26", "matchday26")).toBe(true);
    expect(betaPass("old-code-1", "matchday26")).toBe(false);
    expect(betaPass(undefined, "matchday26")).toBe(false);
    expect(betaPass("short", "short")).toBe(false);
    expect(betaPass(undefined, undefined)).toBe(false);
  });
});
