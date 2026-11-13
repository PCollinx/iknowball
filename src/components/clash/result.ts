import type { Kit } from "@/components/daily/ShirtBack";
import type { Item, Stat } from "@/lib/clash/rules";
import type { Result } from "@/lib/clash/data";

// Clash full time, option D (picked 25 Oct 2026, docs/launch-plan.md step 6):
// what the screen and the result image both say. Kept pure so it can be tested.

export type Outcome = { kind: "won" | "level" | "lost"; by: number };

export function outcomeOf(mine: number, theirs: number): Outcome {
  if (mine === theirs) return { kind: "level", by: 0 };
  return { kind: mine > theirs ? "won" : "lost", by: Math.abs(mine - theirs) };
}

/** The sticker beside the album: "Won by 2", "Level", "Lost by 3". */
export function outcomeLabel(o: Outcome): string {
  if (o.kind === "level") return "Level";
  return `${o.kind === "won" ? "Won" : "Lost"} by ${o.by}`;
}

/** "22 called before the whistle". A set of N players has N - 1 calls (the
 * first player is shown, not called); running out of players ends a sprint early. */
export function calledLine(answered: number, setSize: number): string {
  return answered >= setSize - 1 ? "Every call made before the whistle" : `${answered} called before the whistle`;
}

/** The challenge answered, as a heading whose last word carries the sash: ["collinsCFC's 14", "beaten"]. */
export function verdict(setter: { name: string; right: number }, o: Outcome): [string, string] {
  const theirs = `${setter.name}'s ${setter.right}`;
  if (o.kind === "won") return [theirs, "beaten"];
  if (o.kind === "level") return [`Level with ${setter.name}'s`, String(setter.right)];
  return [`${o.by} short of ${setter.name}'s`, String(setter.right)];
}

/** The same verdict as a sentence for the screen: "collinsCFC's 14 is beaten." */
export function verdictLine(setter: { name: string; right: number }, o: Outcome): string {
  if (o.kind === "won") return `${setter.name}'s ${setter.right} is beaten.`;
  const [lead, tail] = verdict(setter, o);
  return `${lead} ${tail}.`;
}

export function banter(right: number, setter: Result | null, mine: Result | null): string {
  if (setter && mine && !mine.setter) {
    if (mine.right > setter.right) return `You beat ${setter.name} by ${mine.right - setter.right}. Send it back to them.`;
    if (mine.right === setter.right) return `Level with ${setter.name}. Somebody needs a replay.`;
    return `${setter.name} had ${setter.right}. ${setter.right - mine.right} short. Run it back.`;
  }
  if (right >= 20) return "Twenty-plus in a minute. That's ball knowledge.";
  if (right >= 12) return "Decent shift. Now dare your mates to beat it.";
  return "Warm-up's done. The next one counts.";
}

/** The album page's slots: a kick for every call made ("1" scored, "0" missed),
 * then empty ones up to `size` (a head-to-head pads the shorter run to the longer). */
export function slots(kicks: string, size: number): ("1" | "0" | null)[] {
  return Array.from({ length: Math.max(size, kicks.length) }, (_, i) => (kicks[i] === "1" || kicks[i] === "0" ? kicks[i] : null)) as ("1" | "0" | null)[];
}

/** Columns and slot size for `n` square slots in a box: rows that span the
 * full width at `max` or a touch over when they fit the height, else the
 * largest slots that fit (the widest grid on a tie). */
export function fitSlots(n: number, width: number, height: number, gap: number, max: number): { cols: number; slot: number } {
  const count = Math.max(1, n);
  const tall = (cols: number, slot: number) => Math.ceil(count / cols) * (slot + gap) - gap;
  const full = Math.floor((width + gap) / (max + gap));
  if (count >= full) {
    const slot = (width - gap * (full - 1)) / full;
    if (tall(full, slot) <= height) return { cols: full, slot };
  }
  let best = { cols: 1, slot: 0 };
  for (let cols = 1; cols <= count; cols++) {
    const rows = Math.ceil(count / cols);
    const slot = Math.min((width - gap * (cols - 1)) / cols, (height - gap * (rows - 1)) / rows, max);
    if (slot >= best.slot) best = { cols, slot };
  }
  return best;
}

/** The score whoever plays next has to beat: the top of the challenge's table. */
export function toBeat(table: Result[], right: number): { right: number; name: string } {
  const top = table[0];
  if (!top || top.right <= right) return { right, name: "You" };
  return { right: top.right, name: top.mine ? "You" : top.name };
}

/** One side of the head-to-head: a player's page in the album. */
export type Side = { name: string; right: number; kicks: string; bestRun: number };

// What the result image carries (Collins, 13 Nov 2026, option E "The chain" of
// https://claude.ai/artifact/PahqeKZqGjRTBcuAkLon9a): the score bug, the run's
// first players as the chain shows them, the question, then the dare and the
// challenge link. Made for someone who's never played; the card is a picture,
// so the live link travels in the message. Drawn on the server as a 1080 x 1080
// PNG (src/lib/clash/ResultImage.tsx).

/** One player in the card's chain. Only the first has his number: the game shows it, the rest stay hidden. */
export type ChainLine = { name: string; club: string | null; kit: Kit | undefined; value: number | null; mark: boolean | null };

export type ResultCardData = {
  /** Over the score: "collinsCFC" ("Right" alone for a guest). */
  name: string | null;
  right: number;
  missed: number;
  chain: ChainLine[];
  /** "Who has more league goals?" */
  ask: string;
  /** The score the next player has to beat. */
  toBeat: number;
  /** "playiknowball.com/clash/K7Q2XY", the challenge on the card. */
  link: string;
};

/** Players the card's chain shows at most: the kick-off player and the calls after him. */
export const CARD_CHAIN = 5;

/** Each stat's question as a stranger reads it. */
export const CARD_ASK: Record<Stat, string> = {
  goals: "Who has more league goals?",
  apps: "Who's played more league games?",
  height: "Who's taller?",
  years: "Who stayed longer at his club?",
  clubs: "Who's had more clubs?",
  sample: "Who has more Premier League goals?",
};

type CardInput = {
  stat: Stat;
  items: Item[];
  kicks: string;
  right: number;
  /** Your name on the challenge table; a guest's "Guest AB12" is left off. */
  name: string | null;
  toBeat: number;
  clubs: Map<number, { name: string; kit: Kit }>;
  code: string;
  siteUrl: string;
};

export function resultCardData(d: CardInput): ResultCardData {
  const shown = Math.min(CARD_CHAIN, d.items.length, d.kicks.length + 1);
  return {
    name: d.name && !d.name.startsWith("Guest ") ? d.name : null,
    right: d.right,
    missed: [...d.kicks].filter((k) => k === "0").length,
    chain: d.items.slice(0, shown).map((item, i) => {
      const club = item.club_id !== null ? d.clubs.get(item.club_id) : undefined;
      return { name: item.name, club: club?.name ?? null, kit: club?.kit, value: i === 0 ? item.value : null, mark: i === 0 ? null : d.kicks[i - 1] === "1" };
    }),
    ask: CARD_ASK[d.stat],
    toBeat: d.toBeat,
    link: `${new URL(d.siteUrl).host}/clash/${d.code}`,
  };
}

/** The message that goes with the card; the share button adds the link after
 * it, the only place it can be tapped (the card is a picture). */
export function cardMessage(d: Pick<ResultCardData, "right" | "missed" | "toBeat">): string {
  return `${d.right} right, ${d.missed} missed in 60 seconds of Higher or Lower on iKnowBall. Same players, one go. Can you beat ${d.toBeat}?`;
}
