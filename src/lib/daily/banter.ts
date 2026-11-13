// What the answer box says to a wrong name in Free Recall (Collins, 13 Nov 2026,
// mock at https://claude.ai/artifact/Kw2PJyuuYr4jFiMnS3Snej). A line for the
// moment first, else sometimes their guess said back, else the next line from a
// shuffled pool that never repeats until it's used up. Pidgin is spelled with
// the h ("Na wah ohh", "Omoh"). Pure: the round keeps the state.

export const POOL = [
  "Not on the list. Try again.",
  "Not on the list, chief.",
  "Who told you that one?",
  "E no dey the list.",
  "Offside. Go again.",
  "Flag's up.",
  "VAR says no.",
  "Wide of the post.",
  "Into Row Z.",
  "Off the bar. Doesn't count.",
  "Ref waves it away.",
  "Behind for a goal kick.",
  "Straight into the wall.",
  "Air shot.",
  "Shanked it.",
  "Hit the corner flag.",
  "Wrong dressing room.",
  "Never pulled on that shirt.",
  "Not even in the squad photo.",
  "Name no dey the team sheet.",
  "Haba. Not him.",
  "Omoh, no.",
  "That one no follow.",
  "Nice try. No.",
  "Bold. Wrong, but bold.",
  "That's your uncle's guess.",
  "The linesman saw that.",
  "Ball don burst.",
  "Not this squad, boss.",
  "Close the laptop, open your memory.",
  "Wrong kit.",
  "Back to the training ground.",
  "Ask the kit man, he'd know.",
  "Cleared off the line.",
  "Na lie. Go again.",
  "Don't bring that here.",
];

/** {g} is the name they typed. */
export const ECHO = [
  "{g}? Not on this list.",
  "{g}? Wrong squad.",
  "{g}? Not today.",
  "Not {g}. Go again.",
  "{g}? Good player. Wrong list.",
  "{g}? The ref says no.",
  "{g}? Who sent you?",
  "{g}? E no dey.",
  "{g}? Offside.",
  "You typed {g} with your chest.",
];

export const MOMENTS = {
  streak5: ["The crowd's getting restless.", "Na wah ohh. Settle down.", "Five wide. The gaffer's warming someone up.", "Even the keeper's laughing now."],
  streak3: ["Three wide in a row. Breathe.", "Hat-trick of misses. Reset.", "Calm down. Think of the dressing room.", "Three off target. Take a touch first."],
  late: ["No time for that one.", "Clock's running, chief.", "Seconds left. Think.", "Injury time. Make it count."],
  nil: ["Still nil. One will come.", "Get off the mark.", "Nothing yet. Think of the big names.", "Still looking for the opener."],
  close: ["One more for the full squad. Not him.", "So close. Wrong last man.", "Last place left. Not that one.", "One to find. Keep going."],
} as const;

export type Moment = keyof typeof MOMENTS;

/** Kept by the round between wrong names. */
export type Banter = { bag: number[]; streak: number; misses: number; shown: Moment[] };

export const NEW_BANTER: Banter = { bag: [], streak: 0, misses: 0, shown: [] };

/** How often a plain wrong name gets said back. */
const ECHO_SHARE = 0.25;
/** The clock is red from here, so the late lines start here too. */
export const LATE_SECONDS = 15;

/** The moment a wrong name lands in, first match wins; each shows once a try. */
export function momentOf(b: Pick<Banter, "streak" | "misses" | "shown">, at: { found: number; answers: number; left: number }): Moment | null {
  const due: [Moment, boolean][] = [
    ["streak5", b.streak === 5],
    ["streak3", b.streak === 3],
    ["late", at.left <= LATE_SECONDS],
    ["nil", at.found === 0 && b.misses >= 2],
    ["close", at.answers - at.found === 1],
  ];
  return due.find(([m, yes]) => yes && !b.shown.includes(m))?.[0] ?? null;
}

/** "wayne  ROONEY" → "Wayne Rooney"; null when it's too short or long to say back. */
export function sayBack(guess: string): string | null {
  const g = guess.trim().replace(/\s+/g, " ");
  if (g.length < 2 || g.length > 20) return null;
  return g.toLowerCase().replace(/(^|[\s'-])\p{L}/gu, (m) => m.toUpperCase());
}

function shuffled(n: number, rand: () => number): number[] {
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** The line for a wrong name, and the state for the next one. */
export function wrongLine(
  b: Banter,
  guess: string,
  at: { found: number; answers: number; left: number },
  rand: () => number = Math.random,
): { text: string; next: Banter } {
  const counted = { ...b, streak: b.streak + 1, misses: b.misses + 1 };
  const moment = momentOf(counted, at);
  if (moment) {
    const lines = MOMENTS[moment];
    return { text: lines[Math.floor(rand() * lines.length)], next: { ...counted, shown: [...b.shown, moment] } };
  }
  const name = sayBack(guess);
  if (name && rand() < ECHO_SHARE) {
    return { text: ECHO[Math.floor(rand() * ECHO.length)].replace("{g}", name), next: counted };
  }
  const bag = b.bag.length ? b.bag : shuffled(POOL.length, rand);
  return { text: POOL[bag[bag.length - 1]], next: { ...counted, bag: bag.slice(0, -1) } };
}

/** A right name ends the run of misses. */
export function afterRight(b: Banter): Banter {
  return { ...b, streak: 0 };
}
