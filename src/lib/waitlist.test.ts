import { describe, expect, it } from "vitest";
import { betaPass, demoUp, gated, waitlistUp } from "./waitlist";

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
    for (const p of ["/", "/welcome", "/daily", "/daily/table", "/clash", "/clash/GH39HV", "/league", "/league/IKB7QX", "/profile"]) expect(gated(p)).toBe(true);
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

describe("demoUp", () => {
  const video = { src: "/demo/launch-demo.mp4" };
  it("shows on the waitlist's last day, Thu 19 Nov WAT", () => {
    expect(demoUp(new Date("2026-11-18T22:59:59Z"), false, video)).toBe(false);
    expect(demoUp(new Date("2026-11-18T23:00:00Z"), false, video)).toBe(true);
    expect(demoUp(new Date("2026-11-19T22:59:59Z"), false, video)).toBe(true);
    expect(demoUp(new Date("2026-11-19T23:00:00Z"), false, video)).toBe(false);
  });
  it("shows any day on test sites, and never without the video", () => {
    expect(demoUp(new Date("2026-11-17T12:00:00Z"), true, video)).toBe(true);
    expect(demoUp(new Date("2026-11-19T12:00:00Z"), true, null)).toBe(false);
  });
});
