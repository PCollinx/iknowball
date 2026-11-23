import { describe, expect, it } from "vitest";
import { clashWords, dailyOnWords, fullTimeWords, gameHour, gotAway, intentUrl, postBuzz, postState, postsOn, teamWords, xLength } from "./plan";

const site = "https://playiknowball.com";

describe("postsOn", () => {
  it("has the Daily and full time every day, team of the week on Mondays, the Clash dare on Wednesdays", () => {
    expect(postsOn("2026-11-30")).toEqual(["daily-on", "team", "full-time"]); // Monday
    expect(postsOn("2026-12-01")).toEqual(["daily-on", "full-time"]); // Tuesday
    expect(postsOn("2026-12-02")).toEqual(["daily-on", "clash", "full-time"]); // Wednesday
  });
});

describe("gameHour", () => {
  it("reads WAT, an hour on from UTC", () => {
    expect(gameHour(new Date("2026-11-30T08:30:00Z"))).toBe(9);
    expect(gameHour(new Date("2026-11-30T23:10:00Z"))).toBe(0);
  });
});

describe("postState", () => {
  it("keeps what was done by hand first", () => {
    expect(postState("full-time", { status: "skipped", hour: 9, hasWords: true })).toBe("skipped");
  });
  it("waits until the post's hour", () => {
    expect(postState("full-time", { status: null, hour: 21, hasWords: true })).toBe("later");
    expect(postState("full-time", { status: null, hour: 22, hasWords: true })).toBe("ready");
  });
  it("says when there's nothing to post", () => {
    expect(postState("daily-on", { status: null, hour: 9, hasWords: false })).toBe("empty");
  });
});

describe("the words", () => {
  it("puts both halves and the link in the morning post", () => {
    const w = dailyOnWords({ fixture: "Arsenal v Chelsea", first: "Name them.", second: "8 to put in order: who joined first?", siteUrl: site });
    expect(w).toContain("Today's Daily: Arsenal v Chelsea.");
    expect(w).toContain("2nd half: 8 to put in order");
    expect(w.endsWith("playiknowball.com/daily")).toBe(true);
  });
  it("has no team or full time post until someone's played", () => {
    expect(teamWords({ week: "Week 2", top: null, players: 0, siteUrl: site })).toBeNull();
    expect(fullTimeWords({ fixture: "A v B", players: 0, top: null, gotAway: null, siteUrl: site })).toBeNull();
  });
  it("dares with the sprint's own link", () => {
    expect(clashWords({ name: "AdaGooner", right: 19, code: "K7QX2M", siteUrl: site })).toContain("Beat 19.\nplayiknowball.com/clash/K7QX2M");
  });
  it("names the one that got away only when most missed him", () => {
    expect(gotAway([{ name: "Poyet", found: 3 }, { name: "Lampard", found: 9 }], 10)).toEqual({ name: "Poyet", missed: 7 });
    expect(gotAway([{ name: "Lampard", found: 9 }], 10)).toBeNull();
    expect(gotAway([{ name: "Poyet", found: 0 }], 3)).toBeNull();
  });
});

describe("xLength", () => {
  it("counts a link as 23", () => {
    expect(xLength("Go playiknowball.com/clash/K7QX2M")).toBe(3 + 23);
  });
});

describe("intentUrl", () => {
  it("puts the words in X's compose link", () => {
    expect(intentUrl("a b\nc")).toBe("https://x.com/intent/post?text=a%20b%0Ac");
  });
});

describe("postBuzz", () => {
  it("lists what's ready, or nothing", () => {
    expect(postBuzz([])).toBeNull();
    expect(postBuzz(["full-time"])?.title).toBe("Full time is ready to post");
    expect(postBuzz(["daily-on", "team"])).toMatchObject({ title: "2 posts ready today", body: "09:00 The Daily is on · 10:00 Team of the week", url: "/maker/posts" });
  });
});
