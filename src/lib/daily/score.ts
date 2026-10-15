// Points for one part of The Daily. Provisional: the matchweek scoring formula
// is still an open item, so this only has to rank today's players sensibly.
export const POINTS_PER_CORRECT = { free_recall: 40, in_order: 30 } as const;

export type DailyFormat = keyof typeof POINTS_PER_CORRECT;

export function partScore(format: DailyFormat, correct: number): number {
  return Math.max(0, correct) * POINTS_PER_CORRECT[format];
}

/** "Top 36%": where a score sits among today's finished scores (higher is better). */
export function topPercent(mine: number, scores: number[]): number | null {
  if (scores.length < 2) return null;
  const better = scores.filter((s) => s > mine).length;
  return Math.max(1, Math.ceil(((better + 1) / scores.length) * 100));
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
