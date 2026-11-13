import type { DailyRow, OrderReveal, RecallReveal } from "@/lib/daily/data";
import type { DailyFormat } from "@/lib/daily/score";
import { headlineFixture } from "./fixture";
import { shortDate } from "./Masthead";
import type { Kit } from "./ShirtBack";

// The share card's content and sizing, shared by the card on the full-time
// screen and the 1080 x 1080 image drawn on the server.
//
// "The dare, match first" (A3 of https://claude.ai/artifact/PSd1sa2JUbFcgU4LEzcgTq,
// Collins, 13 Nov 2026): made for someone who's never played. Today's match,
// the score in a box beside the two clubs' shirts with question marks, both
// halves' questions, and "Can you beat 40?" with the site. No issue number,
// rating, round names or answers.

export type ShareCardData = {
  /** "Thu 12 Nov". */
  dateLabel: string;
  /** "Man United v Norwich". */
  fixture: string;
  /** Each half's question, written for someone who's never played. */
  first: string;
  second: string | null;
  /** The day score out of 100. */
  points: number;
  /** Who scored it; null says "I scored" (a guest has no name worth printing). */
  name: string | null;
  /** Each club in its own kit; undefined is royal. */
  kits: [Kit | undefined, Kit | undefined];
  host: string;
};

/** The how-to-play tail a prompt ends on, which the card leaves out. */
const HOW_TO = /^(Tap|Earliest|Oldest|First at)\b/;

/** What each round asks, as the card prints it: the prompt without its
 * how-to-play tail, and for the tapped and ordered rounds the count first
 * ("5 players: when were they at Arsenal?"). Free Recall's prompt already
 * says how many. */
export function cardQuestion(daily: Pick<DailyRow, "format" | "prompt" | "answer_count">): string {
  const sentences = daily.prompt.trim().match(/[^.?!]+[.?!]*/g)?.map((s) => s.trim()) ?? [daily.prompt.trim()];
  const kept = sentences.length > 1 ? sentences.filter((s, i) => i === 0 || !HOW_TO.test(s)) : sentences;
  const text = kept.join(" ");
  const lead: Partial<Record<DailyFormat, string>> = {
    pick: `${daily.answer_count} to pick`,
    era: `${daily.answer_count} players`,
    in_order: `${daily.answer_count} to put in order`,
  };
  const count = lead[daily.format];
  return count ? `${count}: ${text.charAt(0).toLowerCase()}${text.slice(1)}` : text;
}

// Big Shoulders 900 capitals run about 0.55em a character across a line,
// spaces included; the fixture sits on one line 88cqw wide.
const FIXTURE_EM = 0.55;

/** The fixture's size in cqw: 6.4 at most, smaller when a long one needs it to stay on one line. */
export function fixtureSize(fixture: string): number {
  return Math.min(6.4, 88 / (fixture.length * FIXTURE_EM));
}

/** "collinsCFC scored", or "I scored" without a name. */
export const scoredBy = (name: string | null) => (name ? `${name} scored` : "I scored");

export type ShareInput = {
  playDate: string;
  recall: RecallReveal;
  order: OrderReveal | null;
  points: number;
  siteUrl: string;
  /** Your name on today's table; a guest's "Guest AB12" is left off. */
  name: string | null;
  kits: [Kit | undefined, Kit | undefined];
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
export function shareCardData({ playDate, recall, order, points, siteUrl, name, kits }: ShareInput): ShareCardData {
  return {
    dateLabel: shortDate(playDate),
    fixture: headlineFixture(recall.daily.title),
    first: cardQuestion(recall.daily),
    second: order ? cardQuestion(order.daily) : null,
    points,
    name: name && !name.startsWith("Guest ") ? name : null,
    kits,
    host: new URL(siteUrl).host,
  };
}

/** The message that goes with the card. */
export function shareMessage(d: Pick<ShareCardData, "fixture" | "points">, siteUrl: string): string {
  return [`I got ${d.points}/100 on today's iKnowBall: ${d.fixture}.`, `Can you beat ${d.points}?`, `${siteUrl.replace(/\/$/, "")}/daily`].join("\n");
}
