import { buildKeys, normalizeName } from "@/lib/daily/match";

// The maker's answer boxes are plain text, one answer per line:
//   Free Recall:  Name | alias, alias
//   In Order:     Name | reveal note        (top line is first)
// Shared by the editor (live preview) and the save action (the real check).

export const MAX_RECALL_ANSWERS = 60;
export const MAX_ORDER_ANSWERS = 10;
const MAX_TEXT = 60;

export type RecallLine = { text: string; aliases: string[] };
export type OrderLine = { text: string; note: string | null };
export type Issues = { errors: string[]; warnings: string[] };

function lines(source: string): [string, string][] {
  return source
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const bar = l.indexOf("|");
      return bar === -1 ? [l, ""] : [l.slice(0, bar).trim(), l.slice(bar + 1).trim()];
    });
}

export function parseRecall(source: string): RecallLine[] {
  return lines(source).map(([text, rest]) => ({
    text,
    aliases: rest
      .split(",")
      .map((a) => a.trim())
      .filter(Boolean),
  }));
}

export function parseOrder(source: string): OrderLine[] {
  return lines(source).map(([text, note]) => ({ text, note: note || null }));
}

export function recallToText(answers: { answer_text: string; extra_aliases: string[] }[]): string {
  return answers
    .map((a) => (a.extra_aliases.length ? `${a.answer_text} | ${a.extra_aliases.join(", ")}` : a.answer_text))
    .join("\n");
}

export function orderToText(answers: { answer_text: string; reveal_note: string | null }[]): string {
  return answers.map((a) => (a.reveal_note ? `${a.answer_text} | ${a.reveal_note}` : a.answer_text)).join("\n");
}

function textErrors(texts: string[]): string[] {
  const errors: string[] = [];
  for (const t of texts) {
    if (!normalizeName(t)) errors.push(`"${t || "(blank)"}" has no letters to match on.`);
    else if (t.length > MAX_TEXT) errors.push(`"${t.slice(0, 20)}…" is longer than ${MAX_TEXT} characters.`);
  }
  return errors;
}

/** Problems that would make Free Recall mark guesses wrongly. */
export function recallIssues(answers: RecallLine[]): Issues {
  const errors = textErrors(answers.map((a) => a.text));
  const warnings: string[] = [];
  if (!answers.length) errors.push("Add at least one answer.");
  if (answers.length > MAX_RECALL_ANSWERS) errors.push(`Keep it to ${MAX_RECALL_ANSWERS} answers or fewer.`);

  // A name or alias that belongs to two answers makes a guess ambiguous.
  const keys = buildKeys(answers.map((a, id) => ({ id, ...a })));
  const owner = new Map<string, number>();
  for (const a of keys) {
    for (const k of a.keys) {
      const other = owner.get(k);
      if (other !== undefined && other !== a.id) {
        errors.push(`"${k}" would count for both ${answers[other].text} and ${answers[a.id].text}.`);
      }
      owner.set(k, a.id);
    }
  }

  // Surnames that two answers share only count as full names.
  const bySurname = new Map<string, string[]>();
  for (const a of answers) {
    const s = normalizeName(a.text).split(" ").pop() ?? "";
    if (s) bySurname.set(s, [...(bySurname.get(s) ?? []), a.text]);
  }
  for (const [s, names] of bySurname) {
    if (names.length < 2) continue;
    const claimed = answers.find((a) => a.aliases.some((x) => normalizeName(x) === s));
    if (claimed) errors.push(`The alias "${s}" gives ${claimed.text} a guess that also fits ${names.filter((n) => n !== claimed.text).join(" and ")}.`);
    else warnings.push(`"${s}" alone won't count, because it fits ${names.join(" and ")}. Full names or aliases only.`);
  }
  return { errors: [...new Set(errors)], warnings };
}

export function orderIssues(answers: OrderLine[]): Issues {
  const errors = textErrors(answers.map((a) => a.text));
  if (answers.length < 2) errors.push("In Order needs at least two answers.");
  if (answers.length > MAX_ORDER_ANSWERS) errors.push(`Keep In Order to ${MAX_ORDER_ANSWERS} answers or fewer.`);
  const seen = new Set<string>();
  for (const a of answers) {
    const k = normalizeName(a.text);
    if (k && seen.has(k)) errors.push(`${a.text} is in the list twice.`);
    seen.add(k);
  }
  return { errors, warnings: [] };
}
