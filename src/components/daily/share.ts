import type { OrderReveal, RecallReveal } from "@/lib/daily/data";
import { fitWidth } from "./FixtureTitle";
import type { Kit } from "./ShirtBack";
import { clock } from "./clock";
import { FORMAT_NAME } from "./formats";

// The share card's content and sizing, shared by the card on the full-time
// screen and the 1080 x 1080 image drawn on the server.

export type ShareCardData = {
  issue: number;
  dateLabel: string;
  title: string;
  prompt: string;
  /** The day score out of 100: the big number and the dare. */
  points: number;
  /** Part 1's answers found, as numbered and empty shirts. */
  found: number;
  total: number;
  /** Both parts' time. */
  timeUsed: string;
  /** Each half, then today's place; `accent` prints in teal. */
  stats: { value: string; key: string; accent?: boolean }[];
  host: string;
  /** Your club, when it's in the fixture. */
  fanOf?: string | null;
  kit?: Kit | null;
  /** Your overall rating out of 10, today included. */
  rating: number | null;
};

export function stampText(short: number): string {
  if (short === 0) return "Full squad";
  return short <= 3 ? `${short} short. So close.` : `${short} short of a full squad`;
}

// Card text runs 90cqw wide; Big Shoulders 900 sets about 0.48em a character
// across a whole line, spaces included.
const LINE_EM = 0.48;

/** Lines the fixture wraps to at a size in cqw, on a card 90cqw wide. */
export function linesAt(fixture: string, size: number): number {
  // Wide letters (W, M) run past the average, so wrap on a safe width.
  const room = 90 / (size * LINE_EM * 1.15);
  let lines = 1;
  let used = 0;
  for (const word of fixture.split(" ")) {
    const need = used ? used + 1 + word.length : word.length;
    if (need > room && used) {
      lines++;
      used = word.length;
    } else used = need;
  }
  return lines;
}

/** The fixture's size in cqw: as big as 10.5, one line if it fits at 7 or
 * more, else two lines at most, never wider than the card. */
export function fixtureSize(fixture: string): number {
  let size = Math.min(10.5, 90 / fitWidth(fixture));
  while (size > 7 && linesAt(fixture, size) > 1) size -= 0.25;
  while (size > 4 && linesAt(fixture, size) > 2) size -= 0.25;
  return size;
}

export type ShareInput = {
  issue: number;
  playDate: string;
  recall: RecallReveal;
  order: OrderReveal | null;
  points: number;
  topPercent: number | null;
  siteUrl: string;
  fanOf: string | null;
  kit: Kit | null;
  rating: number | null;
  /** Time used on both parts, from today's table; Part 1's alone if missing. */
  seconds: number | null;
};

/** "Mon 19 Oct 2026", the same on the server and in the browser. */
export function longDate(playDate: string): string {
  return new Date(`${playDate}T12:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** What the card shows for a finished day. */
export function shareCardData({ issue, playDate, recall, order, points, topPercent, siteUrl, fanOf, kit, rating, seconds }: ShareInput): ShareCardData {
  const found = recall.found.length;
  const total = found + recall.missed.length;
  return {
    issue,
    dateLabel: longDate(playDate),
    title: recall.daily.title,
    prompt: recall.daily.prompt,
    points,
    found,
    total,
    timeUsed: clock(seconds ?? recall.timeUsedSeconds),
    // Each half, then where the day sits (the full-time mix, 22 Oct 2026).
    stats: [
      { value: `${found}/${total}`, key: FORMAT_NAME[recall.daily.format] },
      ...(order ? [{ value: `${order.correct}/${order.slots.length}`, key: FORMAT_NAME[order.daily.format] }] : []),
      { value: topPercent ? `Top ${topPercent}%` : "Early", key: "Today", accent: true },
    ],
    host: new URL(siteUrl).host,
    fanOf,
    kit,
    rating,
  };
}
