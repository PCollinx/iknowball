import type { Position } from "@/lib/daily/data";

// Free Recall's pitch (Collins, 21 Oct 2026): found players line up by position
// in a 4-4-2. A keeper only ever goes in goal and an outfield player never does;
// a second keeper, or anyone whose line is full, goes to the bench.

export type Placed = { id: number; text: string; num: number };

/** A place on the pitch (x, y in %) and who's in it. */
export type Spot = { line: Position; x: number; y: number; player: Placed | null };

export type Lineup = {
  /** The XI's places. With fewer than 11 answers only filled ones are shown. */
  pitch: Spot[];
  /** Found players who didn't fit on the pitch, then empty slots still to find. */
  bench: (Placed | null)[];
  /** Whether empty pitch places are drawn (11 or more answers). */
  fullXI: boolean;
};

// Each line fills from the middle out.
const FORMATION: [Position, number, number][] = [
  ["GK", 50, 87],
  ["DEF", 37, 67],
  ["DEF", 63, 67],
  ["DEF", 12, 65],
  ["DEF", 88, 65],
  ["MID", 37, 40],
  ["MID", 63, 40],
  ["MID", 12, 38],
  ["MID", 88, 38],
  ["FWD", 38, 13],
  ["FWD", 62, 13],
];

/** Where an outfield player with no known position may stand, in order. */
const ANYWHERE: Position[] = ["MID", "FWD", "DEF"];

export function lineup(found: { id: number; text: string; position: Position | null }[], answerCount: number): Lineup {
  const pitch: Spot[] = FORMATION.map(([line, x, y]) => ({ line, x, y, player: null }));
  const benched: Placed[] = [];
  const free = (line: Position) => pitch.find((s) => s.line === line && !s.player);

  found.forEach((f, k) => {
    const player = { id: f.id, text: f.text, num: k + 1 };
    const spot = f.position ? free(f.position) : ANYWHERE.map(free).find(Boolean);
    if (spot) spot.player = player;
    else benched.push(player);
  });

  const fullXI = answerCount >= FORMATION.length;
  const emptyOnPitch = fullXI ? pitch.filter((s) => !s.player).length : 0;
  const stillToFind = Math.max(0, answerCount - found.length - emptyOnPitch);
  return {
    pitch: fullXI ? pitch : pitch.filter((s) => s.player),
    bench: [...benched, ...Array<null>(stillToFind).fill(null)],
    fullXI,
  };
}
