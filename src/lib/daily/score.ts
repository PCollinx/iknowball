// A day of The Daily scores out of 100 (decided 16 Oct 2026, see CLAUDE.md
// "Rating and scoring"): Part 1 up to 60 and Part 2 up to 40, by the share of
// answers right, so a day with more answers weighs the same as one with fewer.

/** Most points a part can give a day. */
export const PART_MAX: Record<number, number> = { 1: 60, 2: 40 };

export type DailyFormat = "free_recall" | "in_order" | "pick" | "era";

export function partScore(part: number, correct: number, answerCount: number): number {
  const share = answerCount > 0 ? Math.min(1, Math.max(0, correct) / answerCount) : 0;
  return Math.round((PART_MAX[part] ?? 0) * share);
}

/** A half's rating out of 10 for full time (22 Oct 2026): its points over the
 * most it could give, to one decimal like a match rating. */
export function halfRating(part: number, score: number): number {
  const max = PART_MAX[part] ?? 0;
  return max ? Math.round((Math.max(0, Math.min(score, max)) / max) * 100) / 10 : 0;
}

/** "Top 36%": where a score sits among today's finished scores (higher is better). */
export function topPercent(mine: number, scores: number[]): number | null {
  if (scores.length < 2) return null;
  const better = scores.filter((s) => s > mine).length;
  return Math.max(1, Math.ceil(((better + 1) / scores.length) * 100));
}

export type TableEntry = { userId: string; score: number; seconds: number };

/** A day's table: best score first, ties to less time used (CLAUDE.md,
 * "Rating and scoring"). Level on both, players share a position. */
export function rankTable<T extends TableEntry>(entries: T[]): (T & { position: number })[] {
  const sorted = [...entries].sort((a, b) => b.score - a.score || a.seconds - b.seconds);
  return sorted.map((e, i) => {
    const level = sorted.findIndex((x) => x.score === e.score && x.seconds === e.seconds);
    return { ...e, position: (level === -1 ? i : level) + 1 };
  });
}

/** Stable shuffle seeded by the attempt, so a reload shows the same order. */
export function seededShuffle<T extends { id: number }>(items: T[], seed: number): T[] {
  const key = (id: number) => {
    let h = (id * 2654435761 + seed * 40503) >>> 0;
    h ^= h >>> 15;
    h = Math.imul(h, 2246822519) >>> 0;
    return h ^ (h >>> 13);
  };
  const out = [...items].sort((a, b) => key(a.id) - key(b.id));
  // Never hand out the answer already in order.
  if (out.length > 1 && out.every((x, i) => x.id === items[i].id)) out.push(out.shift()!);
  return out;
}
