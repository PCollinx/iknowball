import type { DailyFormat } from "@/lib/daily/score";

/** What each kind of round is called on screen. */
export const FORMAT_NAME: Record<DailyFormat, string> = {
  free_recall: "Free Recall",
  in_order: "In Order",
  pick: "Rapid picks",
  era: "Era picks",
};

/** The task line on the kick-off page. */
export const FORMAT_RULE: Record<DailyFormat, (n: number) => string> = {
  free_recall: (n) => `Name as many as you can. ${n} to find.`,
  in_order: (n) => `Put all ${n} in the right order.`,
  pick: (n) => `${n} questions. Tap the right one, fast.`,
  era: (n) => `${n} players. Tap when they were there.`,
};

/** What each part is called on screen: the Daily is one match in two halves (Collins, 13 Nov 2026). */
export const halfName = (part: number) => (part === 1 ? "First half" : "Second half");

/** Part 1 or Part 2 rounds that are tapped, not typed or ordered. */
export const isPick = (format: DailyFormat) => format === "pick" || format === "era";

/** 1st, 2nd, 3rd, 4th … 11th, 12th, 13th … 21st. */
export function ordinal(n: number): string {
  const teen = n % 100 >= 11 && n % 100 <= 13;
  const suffix = teen ? "th" : (["th", "st", "nd", "rd"][n % 10] ?? "th");
  return `${n}${suffix}`;
}

/** How a Rapid picks career path is written in its question: club names joined by arrows. */
export const PATH_ARROW = " → ";

/**
 * A picks question that names clubs ("Yaya Touré at Barcelona → Man City",
 * "Frank Lampard at Chelsea"): who it's about and the clubs after the last
 * " at ", in order. Null for any other question (a season, a scoreline).
 */
export function questionClubs(question: string | null): { who: string; clubs: string[] } | null {
  const at = question?.lastIndexOf(" at ") ?? -1;
  if (!question || at <= 0) return null;
  const clubs = question
    .slice(at + 4)
    .split(PATH_ARROW)
    .map((c) => c.trim())
    .filter(Boolean);
  return clubs.length ? { who: question.slice(0, at), clubs } : null;
}

/** How a picks question's big line is drawn (option S·A, Collins, 25 Nov 2026). */
export type QuestionLine =
  /** "Yaya Touré at Barcelona → Man City": who, then each club as its kit. */
  | { kind: "at"; who: string; clubs: string[] }
  /** "Arsenal 2–0 Burnley · Sat 25 Oct": both kits with the score between, the date as a label. */
  | { kind: "match"; home: string; away: string; score: string; when: string | null }
  /** "Man United's 7th Premier League title": the title with the club's kit. */
  | { kind: "title"; club: string; what: string }
  /** "Thierry Henry's 2nd Golden Boot": the player with the award on a stamp. */
  | { kind: "award"; who: string; what: string }
  /** "2003/04": the season, big. */
  | { kind: "season"; season: string }
  | { kind: "plain"; text: string };

const MATCH = /^(.+?) (\d+)–(\d+) (.+?)(?: · (.+))?$/;
const COUNTED = /^(.+?)(?:'s|') ((?:\d+(?:st|nd|rd|th) )?(Premier League title|Golden Boot))$/;
const SEASON = /^\d{4}\/\d{2}$/;

/** Reads a picks question into the parts its line draws; anything unknown stays plain. */
export function questionLine(question: string): QuestionLine {
  const at = questionClubs(question);
  if (at) return { kind: "at", ...at };
  const match = MATCH.exec(question);
  if (match) return { kind: "match", home: match[1], away: match[4], score: `${match[2]}–${match[3]}`, when: match[5] ?? null };
  const counted = COUNTED.exec(question);
  if (counted) return counted[3] === "Golden Boot" ? { kind: "award", who: counted[1], what: counted[2] } : { kind: "title", club: counted[1], what: counted[2] };
  if (SEASON.test(question)) return { kind: "season", season: question };
  return { kind: "plain", text: question };
}

/** The clubs a question's line dresses in their kits. */
export function lineClubs(question: string | null): string[] {
  if (!question) return [];
  const line = questionLine(question);
  return line.kind === "at" ? line.clubs : line.kind === "match" ? [line.home, line.away] : line.kind === "title" ? [line.club] : [];
}
