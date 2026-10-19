// Clash's Higher or Lower sprint: the rules, kept pure so they can be tested.
// Decided 19 Oct 2026 (Collins picked the layout from the mocks).

/** The sprint's length, started on the server. */
export const SPRINT_SECONDS = 60;
/** What a wrong answer takes off the clock. */
export const PENALTY_SECONDS = 5;
/** Players in a set: more than anyone answers in a minute. */
export const SET_SIZE = 40;

export type Stat = "goals" | "apps" | "sample";

export const STATS: Record<Stat, { label: string; short: string; min: number }> = {
  goals: { label: "League goals for the club", short: "League goals", min: 5 },
  apps: { label: "League games for the club", short: "League games", min: 40 },
  sample: { label: "Premier League goals (sample)", short: "PL goals", min: 0 },
};

export type Item = { name: string; club_id: number | null; value: number };

/** "more": the next player's number is higher; "fewer": lower; "level": the same. */
export type Guess = "more" | "fewer" | "level";

/** Level numbers count as right for "more" and "fewer" too, so a tie never costs you. */
export function isRight(shown: number, next: number, guess: Guess): boolean {
  if (next === shown) return true;
  if (guess === "level") return false;
  return guess === "more" ? next > shown : next < shown;
}

/**
 * Orders a pool into a chain: no player twice, and no two neighbours with the
 * same number where it can be helped (a tie is a free point).
 */
export function buildChain(pool: Item[], size = SET_SIZE, random = Math.random): Item[] {
  const seen = new Set<string>();
  const left = pool.filter((p) => {
    const key = `${p.name}|${p.club_id}`;
    return !seen.has(key) && seen.add(key);
  });
  for (let i = left.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [left[i], left[j]] = [left[j], left[i]];
  }
  const chain: Item[] = [];
  while (chain.length < size && left.length) {
    const last = chain.at(-1);
    const k = last ? left.findIndex((p) => p.value !== last.value && p.name !== last.name) : 0;
    chain.push(left.splice(k === -1 ? 0 : k, 1)[0]);
  }
  return chain;
}

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** A challenge code: six letters and digits, without the ones people misread (0/O, 1/I). */
export function newCode(random = Math.random): string {
  return Array.from({ length: 6 }, () => CODE_CHARS[Math.floor(random() * CODE_CHARS.length)]).join("");
}

/** A run's state after one answer. */
export type RunState = { answered: number; right: number; currentRun: number; bestRun: number; kicks: string };

export function afterAnswer(s: RunState, right: boolean): RunState {
  const currentRun = right ? s.currentRun + 1 : 0;
  return {
    answered: s.answered + 1,
    right: s.right + (right ? 1 : 0),
    currentRun,
    bestRun: Math.max(s.bestRun, currentRun),
    kicks: s.kicks + (right ? "1" : "0"),
  };
}
