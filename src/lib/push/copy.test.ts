import { describe, expect, it } from "vitest";
import { challengePlayed, dailyClosing, dailyUp, leagueWeek } from "./copy";

describe("the whistle's words", () => {
  it("puts the fixture in the morning title and the prompt in the body", () => {
    const b = dailyUp({ title: "Arsenal v Chelsea", prompt: "Name everyone who's played for both since 1992" });
    expect(b.title).toBe("Arsenal v Chelsea is on");
    expect(b.body).toBe("Name everyone who's played for both since 1992. Clock starts when you do.");
    expect(b.url).toBe("/daily");
  });

  it("clips a long prompt at a word", () => {
    const b = dailyUp({ title: "Arsenal v Chelsea", prompt: "word ".repeat(40) });
    expect(b.body.length).toBeLessThanOrEqual(120);
    expect(b.body.endsWith("…")).toBe(true);
  });

  it("names the streak only when there is one worth keeping", () => {
    expect(dailyClosing({ title: "Arsenal v Chelsea" }, 6).body).toBe("Your 6-day streak goes at midnight. Arsenal v Chelsea is waiting.");
    expect(dailyClosing({ title: "Arsenal v Chelsea" }, 1).body).toBe("Arsenal v Chelsea closes at midnight.");
  });

  it("says whether the mate beat, matched or missed your score", () => {
    const c = { name: "tunde9", mine: 14, stat: "Height", code: "K7QX2M" };
    expect(challengePlayed({ ...c, theirs: 17 })).toMatchObject({ title: "tunde9 beat your 14", body: "17 right on Height. Settle it.", url: "/clash/K7QX2M" });
    expect(challengePlayed({ ...c, theirs: 14 }).title).toBe("tunde9 matched your 14");
    expect(challengePlayed({ ...c, theirs: 11 })).toMatchObject({ title: "tunde9 couldn't beat your 14", body: "11 right on Height. Your 14 stands." });
  });

  it("gives the league's finish and the gap to the top", () => {
    const l = { name: "Lekki Ballers", code: "IKB7QX", points: 412 };
    expect(leagueWeek({ ...l, position: 2, leader: { name: "collinsCFC", points: 440 } })).toMatchObject({
      title: "Lekki Ballers: you finished 2nd",
      body: "412 points, 28 behind collinsCFC. New week, Daily's on.",
    });
    expect(leagueWeek({ ...l, position: 1, leader: null }).body).toBe("412 points, top of the table. New week, Daily's on.");
  });
});
