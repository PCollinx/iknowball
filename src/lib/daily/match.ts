// Answer matching for The Daily. Runs on the server only: the answer key never
// reaches the browser. Aliases plus a small typo allowance, so "fabregaz" counts
// for Fàbregas but "Cole" never counts for a different Cole.

/** Same rules as public.normalize_name() in the database. */
export function normalizeName(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
}

/** Typos allowed for a key of this length: none under 5 letters, 2 from 9. */
export function typoAllowance(key: string): number {
  if (key.length < 5) return 0;
  return key.length >= 9 ? 2 : 1;
}

export type AnswerKeys = { id: number; keys: string[] };

/**
 * Builds each answer's match keys: its display text, its aliases and, when no
 * other answer in the same Daily shares it, its surname.
 */
export function buildKeys(answers: { id: number; text: string; aliases: string[] }[]): AnswerKeys[] {
  const surnameOf = (text: string) => normalizeName(text).split(" ").pop() ?? "";
  const surnameCount = new Map<string, number>();
  for (const a of answers) {
    const s = surnameOf(a.text);
    surnameCount.set(s, (surnameCount.get(s) ?? 0) + 1);
  }
  return answers.map((a) => {
    const keys = new Set([a.text, ...a.aliases].map(normalizeName).filter(Boolean));
    const s = surnameOf(a.text);
    if (s.length >= 3 && surnameCount.get(s) === 1) keys.add(s);
    return { id: a.id, keys: [...keys] };
  });
}

/**
 * Returns the id of the answer a guess matches, or null. An exact key match
 * wins over a typo match, and a typo match must be unambiguous.
 */
export function matchAnswer(input: string, answers: AnswerKeys[]): number | null {
  const guess = normalizeName(input);
  if (!guess) return null;
  for (const a of answers) if (a.keys.includes(guess)) return a.id;

  let best: { id: number; distance: number } | null = null;
  let tie = false;
  for (const a of answers) {
    for (const key of a.keys) {
      const allowed = typoAllowance(key);
      if (!allowed || Math.abs(key.length - guess.length) > allowed) continue;
      const distance = levenshtein(guess, key);
      if (distance > allowed) continue;
      if (!best || distance < best.distance) {
        best = { id: a.id, distance };
        tie = false;
      } else if (distance === best.distance && best.id !== a.id) {
        tie = true;
      }
    }
  }
  return best && !tie ? best.id : null;
}
