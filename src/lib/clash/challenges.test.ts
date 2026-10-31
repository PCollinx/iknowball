import { describe, expect, it } from "vitest";
import { challengeOf, type ChallengeSet } from "./challenges";

const set: ChallengeSet = { code: "K7QX2M", stat: "goals", createdAt: "2026-10-30T10:00:00Z", seenAt: null, createdBy: "me" };
const now = Date.parse("2026-10-31T10:00:00Z");
const run = (userId: string, right: number, finishedAt = "2026-10-30T12:00:00Z") => ({ userId, name: userId, right, finishedAt });

describe("challengeOf", () => {
  it("waits until someone else plays it", () => {
    const c = challengeOf(set, [run("me", 14)], now);
    expect(c).toMatchObject({ state: "waiting", played: 1, mine: 14, rival: null, news: false });
  });

  it("is beaten, and news, when a mate scores more", () => {
    const c = challengeOf(set, [run("me", 14), run("ada", 11), run("tunde", 17)], now);
    expect(c).toMatchObject({ state: "beaten", played: 3, rival: { name: "tunde", right: 17 }, news: true });
  });

  it("keeps you on top on a level score", () => {
    expect(challengeOf(set, [run("me", 14), run("tunde", 14)], now).state).toBe("top");
  });

  it("stops being news once you've opened the table since the beat", () => {
    const seen = { ...set, seenAt: "2026-10-30T13:00:00Z" };
    expect(challengeOf(seen, [run("me", 14), run("tunde", 17)], now).news).toBe(false);
    expect(challengeOf(seen, [run("me", 14), run("tunde", 17), run("femi", 19, "2026-10-30T15:00:00Z")], now).news).toBe(true);
  });

  it("stops being news after a week", () => {
    expect(challengeOf(set, [run("me", 14), run("tunde", 17)], Date.parse("2026-11-07T11:00:00Z")).news).toBe(false);
  });
});
