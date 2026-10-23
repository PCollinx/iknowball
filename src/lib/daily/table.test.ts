import { describe, expect, it } from "vitest";
import { chaseLine, sampleMembers, sampleRows, tableView } from "./table";

const row = (userId: string, score: number, seconds = 100) => ({ userId, name: userId, score, seconds });
// a scores 100, b 99, … one point apart, so places follow the letters.
const field = (n: number) => Array.from({ length: n }, (_, i) => row(`p${i + 1}`, 100 - i));

describe("tableView", () => {
  it("puts the top three on the podium and the rest in the list", () => {
    const view = tableView(field(6), null);
    expect(view.podium.map((r) => r.position)).toEqual([1, 2, 3]);
    expect(view.list.map((r) => r.position)).toEqual([4, 5, 6]);
    expect(view.hidden).toBeNull();
    expect(view.around).toEqual([]);
  });

  it("shows you in place above the cut, with the rest counted after it", () => {
    const view = tableView(field(12), "p4", 8);
    expect(view.mine?.position).toBe(4);
    expect(view.around).toEqual([]);
    expect(view.hidden).toEqual({ from: 9, to: 12 });
  });

  it("brings the rows around you up below the cut", () => {
    const view = tableView(field(20), "p15", 8);
    expect(view.around.map((r) => r.position)).toEqual([13, 14, 15, 16, 17]);
    expect(view.hidden).toEqual({ from: 9, to: 12 });
  });

  it("leaves no gap when you're just below the cut", () => {
    const view = tableView(field(20), "p9", 8);
    expect(view.around.map((r) => r.position)).toEqual([9, 10, 11]);
    expect(view.hidden).toBeNull();
  });

  it("ranks a tab among its own players", () => {
    const view = tableView([row("x", 40), row("y", 60)], "x");
    expect(view.mine?.position).toBe(2);
    expect(view.topPercent).toBe(100);
    expect(view.players).toBe(2);
  });
});

describe("chaseLine", () => {
  const ranked = (rows: ReturnType<typeof row>[]) => tableView(rows, null).podium.concat(tableView(rows, null).list);

  it("tells the leader they're top", () => {
    const rows = ranked([row("a", 90), row("b", 80)]);
    expect(chaseLine(rows, rows[0])).toBe("Top of the pile.");
    expect(chaseLine(ranked([row("a", 50)]), ranked([row("a", 50)])[0])).toBe("First in. Everyone else is chasing you.");
  });

  it("names the quicker player on the same score", () => {
    const rows = ranked([row("a", 58, 270), row("b", 58, 281)]);
    expect(chaseLine(rows, rows[1])).toBe("Level with a on 58, who was 11 seconds quicker.");
  });

  it("gives the gap to the row above", () => {
    const rows = ranked([row("a", 61), row("b", 60), row("c", 58)]);
    expect(chaseLine(rows, rows[2])).toBe("2 points off b in 2nd.");
    expect(chaseLine(rows, rows[1])).toBe("1 point off a in 1st.");
  });

  it("calls a dead heat level", () => {
    const rows = ranked([row("a", 70, 200), row("b", 70, 200)]);
    expect(chaseLine(rows, rows[1])).toBe("Level with a on points and time.");
  });
});

describe("sampleRows", () => {
  it("makes the same field every time, with your club in it", () => {
    const rows = sampleRows(["a", "b", "c"], "mine");
    expect(rows).toEqual(sampleRows(["a", "b", "c"], "mine"));
    expect(new Set(rows.map((r) => r.userId)).size).toBe(rows.length);
    expect(rows.some((r) => r.club === "mine")).toBe(true);
    expect(rows.every((r) => r.p1 <= 60 && (r.p2 ?? 0) <= 40 && r.score === r.p1 + (r.p2 ?? 0))).toBe(true);
  });

  it("puts sample players in your leagues", () => {
    const ids = new Set(sampleRows([], null).map((r) => r.userId));
    expect(sampleMembers(0).every((id) => ids.has(id))).toBe(true);
  });
});
