import { shownChoices, type PickLine } from "@/lib/maker/parse";
import {
  eraPicks,
  hash,
  ORDER_SECONDS,
  orderAnswers,
  pickSeconds,
  rapidPicks,
  recallAnswers,
  recallSeconds,
  type Club,
  type DatedSpell,
  type Decoy,
  type SharedPlayer,
} from "./generate";
import { allThereTogether, dressingRoom, oldestFirst, straightSwap, templateSeed, yearOfMove, type CareerSpell, type ClubSpell } from "./templates";

// A whole day: which template each part uses, and the part it makes. Each
// round type has a few templates; they take turns by date, one used in the
// last week goes to the back, and one the data can't fill hands on to the next.

/** One answer row, as public.maker_save_day takes it. */
export type DraftAnswer = {
  answer_text: string;
  extra_aliases: string[];
  position: number | null;
  reveal_note: string | null;
  question?: string | null;
  choices?: string[];
};
export type DraftPart = {
  format: "free_recall" | "pick" | "in_order" | "era";
  /** Which template drafted it ("played-for-both", "oldest-first", …), saved on the Daily. */
  template: string;
  title: string;
  prompt: string;
  time: number;
  answers: DraftAnswer[];
};
export type DraftDay = { part1: DraftPart; part2: DraftPart | null };

/** What the picks rounds are built from. Without it, a day gets the typed rounds. */
export type PickData = { decoys: Decoy[]; spells: Map<number, DatedSpell[]>; nowYear: number };

/** What the newer templates need. Without it, a day uses only the first template of each round type. */
export type TemplateData = {
  /** Every club, for the clubs a move or a chain names. */
  clubs: Map<number, Club>;
  /** Every spell at the day's two clubs. */
  spellsAt: Map<number, ClubSpell[]>;
  /** Careers of the players at the day's two clubs. */
  careers: Map<number, CareerSpell[]>;
  /** Templates used in the last 7 days, which go to the back of the queue. */
  recentTemplates: Set<string>;
};

/** The template kinds, by round type. The first of each is the original. */
export const TEMPLATES = {
  // Three-club chain (Free Recall #14) was tried and dropped on 29 Oct 2026: no
  // pair had more than 5 players at both clubs and a third top club.
  free_recall: ["played-for-both", "dressing-room"],
  pick: ["played-for-both-picks", "straight-swap"],
  in_order: ["joined-first", "oldest-first"],
  era: ["era-years", "year-of-move", "all-there-together"],
} as const;
export type Template = (typeof TEMPLATES)[keyof typeof TEMPLATES][number];

/** The order to try a round type's templates on a date: turns by date, the ones used lately last. */
export function templateOrder<T extends string>(templates: readonly T[], date: string, recent: Set<string>): T[] {
  const day = Math.round(Date.parse(`${date}T00:00:00Z`) / 86_400_000);
  const k = ((day % templates.length) + templates.length) % templates.length;
  const turn = [...templates.slice(k), ...templates.slice(0, k)];
  return [...turn.filter((t) => !recent.has(t)), ...turn.filter((t) => recent.has(t))];
}

/** The day's round types, mixed (Collins, 19 Oct 2026): the four pairings take
 * turns by date, so every week gets each of them and Part 1 and Part 2 both
 * change from one day to the next. */
const PAIRINGS = [
  { rapid: true, era: false },
  { rapid: false, era: true },
  { rapid: true, era: true },
  { rapid: false, era: false },
] as const;

export function pairingFor(date: string): (typeof PAIRINGS)[number] {
  const day = Math.round(Date.parse(`${date}T00:00:00Z`) / 86_400_000);
  return PAIRINGS[((day % 4) + 4) % 4];
}

const pickAnswers = (lines: PickLine[]): DraftAnswer[] =>
  lines.map((l, i) => ({ answer_text: l.answer, extra_aliases: [], position: i + 1, reveal_note: null, question: l.question, choices: shownChoices(l) }));

function recallPart(template: string, title: string, prompt: (n: number) => string, players: SharedPlayer[]): DraftPart {
  const answers = recallAnswers(players);
  return {
    format: "free_recall",
    template,
    title,
    prompt: prompt(answers.length),
    time: recallSeconds(answers.length),
    answers: answers.map((a) => ({ answer_text: a.text, extra_aliases: a.aliases, position: null, reveal_note: null })),
  };
}

/**
 * Part 1 is Rapid picks or Free Recall, Part 2 Era picks or In Order, by
 * `pairingFor`. Within a round type the templates take turns; a picks round
 * no template can fill falls back to the typed one.
 */
export function draftDay(
  date: string,
  home: Club,
  away: Club,
  players: SharedPlayer[],
  recent: Set<string>,
  picks?: PickData,
  more?: TemplateData,
): DraftDay {
  const title = `${home.name} v ${away.name}`;
  const pairing = picks ? pairingFor(date) : { rapid: false, era: false };
  const used = more?.recentTemplates ?? new Set<string>();
  const order = <T extends string>(list: readonly T[]) => (more ? templateOrder(list, date, used) : [list[0]]);
  // Each club, the home side or the away side first by the date.
  const sides = (template: string) => (templateSeed(date, template) % 2 ? [away, home] : [home, away]);

  const build: Record<Template, () => DraftPart | null> = {
    "played-for-both": () =>
      recallPart("played-for-both", title, (n) => `Name the ${n} players who've played for both ${home.name} and ${away.name} since 1992.`, players),

    "dressing-room": () => {
      for (const club of sides("dressing-room")) {
        const room = more && dressingRoom(more.spellsAt.get(club.id) ?? [], recent, templateSeed(date, "dressing-room"), date);
        if (room)
          return recallPart(
            "dressing-room",
            title,
            (n) => `Name the ${n} players who shared ${club.name}'s dressing room with ${room.player.name} for a season or more.`,
            room.teammates,
          );
      }
      return null;
    },

    "played-for-both-picks": () => {
      const lines = picks ? rapidPicks(players, picks.decoys, home, away, recent, hash(date)) : [];
      return lines.length
        ? { format: "pick", template: "played-for-both-picks", title, prompt: `Tap the player who's played for both ${home.name} and ${away.name} since 1992.`, time: pickSeconds(lines.length), answers: pickAnswers(lines) }
        : null;
    },

    "straight-swap": () => {
      const lines = picks && more ? straightSwap(players, more.careers, picks.decoys, home, away, recent, templateSeed(date, "straight-swap")) : [];
      return lines.length
        ? { format: "pick", template: "straight-swap", title, prompt: `Tap the player who moved straight between ${home.name} and ${away.name}, either way.`, time: pickSeconds(lines.length), answers: pickAnswers(lines) }
        : null;
    },

    "joined-first": () => {
      // Whichever club gives a spread of signing years, the date picking which to try first.
      const seed = hash(date);
      const first = seed % 2 ? "joinedB" : "joinedA";
      for (const joined of [first, first === "joinedA" ? "joinedB" : "joinedA"] as const) {
        const lines = orderAnswers(players, joined, recent, seed);
        const club = joined === "joinedA" ? home : away;
        if (lines.length)
          return {
            format: "in_order",
            template: "joined-first",
            title: "In order",
            prompt: `They all played for ${club.name}. Who joined first? Earliest at the top.`,
            time: ORDER_SECONDS,
            answers: lines.map((a, i) => ({ answer_text: a.text, extra_aliases: [], position: i + 1, reveal_note: a.note })),
          };
      }
      return null;
    },

    "oldest-first": () => {
      for (const club of sides("oldest-first")) {
        const lines = more ? oldestFirst(more.spellsAt.get(club.id) ?? [], recent, templateSeed(date, "oldest-first")) : [];
        if (lines.length)
          return {
            format: "in_order",
            template: "oldest-first",
            title: "In order",
            prompt: `They all played for ${club.name}. Who's the oldest? Oldest at the top.`,
            time: ORDER_SECONDS,
            answers: lines.map((a, i) => ({ answer_text: a.text, extra_aliases: [], position: i + 1, reveal_note: a.note })),
          };
      }
      return null;
    },

    "era-years": () => {
      for (const club of hash(date) % 2 ? [away, home] : [home, away]) {
        const lines = picks ? eraPicks(picks.spells.get(club.id) ?? [], club, recent, hash(date), picks.nowYear) : [];
        if (lines.length)
          return { format: "era", template: "era-years", title: "Era picks", prompt: `When were they at ${club.name}? Tap the right years.`, time: pickSeconds(lines.length, true), answers: pickAnswers(lines) };
      }
      return null;
    },

    "year-of-move": () => {
      if (!picks || !more) return null;
      const at = [...(more.spellsAt.get(home.id) ?? []), ...(more.spellsAt.get(away.id) ?? [])];
      const lines = yearOfMove(at, more.careers, more.clubs, [home, away], recent, templateSeed(date, "year-of-move"), picks.nowYear);
      return lines.length
        ? { format: "era", template: "year-of-move", title: "Era picks", prompt: "When did they make the move? Tap the year.", time: pickSeconds(lines.length, true), answers: pickAnswers(lines) }
        : null;
    },

    "all-there-together": () => {
      for (const club of sides("all-there-together")) {
        const lines = picks && more ? allThereTogether(more.spellsAt.get(club.id) ?? [], club, recent, templateSeed(date, "all-there-together"), picks.nowYear) : [];
        if (lines.length)
          return {
            format: "era",
            template: "all-there-together",
            title: "Era picks",
            prompt: `When were all three at ${club.name} together? Tap the years.`,
            time: pickSeconds(lines.length, true),
            answers: pickAnswers(lines),
          };
      }
      return null;
    },
  };
  const first = (templates: Template[]) => {
    for (const t of templates) {
      const part = build[t]();
      if (part) return part;
    }
    return null;
  };

  const part1 = (pairing.rapid && first(order(TEMPLATES.pick))) || first(order(TEMPLATES.free_recall)) || build["played-for-both"]()!;
  const part2 = (pairing.era && first(order(TEMPLATES.era))) || first(order(TEMPLATES.in_order));
  return { part1, part2 };
}
