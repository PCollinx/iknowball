import type { Stat } from "./rules";

// Your challenges (Collins, 31 Oct 2026): each set you started, with where you
// stand on it. A challenge is beaten when someone else finished it with more
// right than you; that's news on home until you open its table, and only for
// a week. Pure, so it can be tested.

/** How long a beaten challenge stays news on home. */
export const NEWS_DAYS = 7;

/** A finished go at a set. */
export type ChallengeRun = { userId: string; name: string; right: number; finishedAt: string };

export type ChallengeSet = { code: string; stat: Stat; createdAt: string; seenAt: string | null; createdBy: string };

export type Challenge = {
  code: string;
  stat: Stat;
  /** Everyone who finished it, you included. */
  played: number;
  mine: number | null;
  /** The best of everyone else: the one who beat you, or the closest to you. */
  rival: { userId: string; name: string; right: number } | null;
  state: "beaten" | "top" | "waiting";
  /** Beaten since you last opened its table, and under a week old. */
  news: boolean;
};

export function challengeOf(set: ChallengeSet, runs: ChallengeRun[], now = Date.now()): Challenge {
  const mine = runs.find((r) => r.userId === set.createdBy) ?? null;
  // Highest first; on a level score, whoever got there first.
  const others = runs.filter((r) => r.userId !== set.createdBy).sort((a, b) => b.right - a.right || Date.parse(a.finishedAt) - Date.parse(b.finishedAt));
  const best = others[0] ?? null;
  const state = !best ? "waiting" : best.right > (mine?.right ?? 0) ? "beaten" : "top";
  const since = Date.parse(set.seenAt ?? set.createdAt);
  const news = state === "beaten" && others.some((r) => r.right > (mine?.right ?? 0) && Date.parse(r.finishedAt) > since) && now - Date.parse(set.createdAt) < NEWS_DAYS * 86_400_000;
  return {
    code: set.code,
    stat: set.stat,
    played: runs.length,
    mine: mine?.right ?? null,
    rival: best && { userId: best.userId, name: best.name, right: best.right },
    state,
    news,
  };
}
