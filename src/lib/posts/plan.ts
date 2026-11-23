import { GAME_UTC_OFFSET_HOURS } from "@/lib/time";

// The maker's Posts tab (Collins, 23 Nov 2026, option A of
// https://claude.ai/artifact/81Un4JKJRd1BJp4yuKevAC): no X API and no bill.
// Each day's posts are made ready here (the words, the card, the link) and
// Collins sends them from his own X app with one tap. Pure, so it's tested.

export type PostKind = "daily-on" | "team" | "clash" | "full-time";

type PostSlot = {
  label: string;
  /** The hour (WAT) it's due; the post's buttons wake up then. */
  hour: number;
  /** Only on this weekday (0 Sunday … 6 Saturday); every day when left out. */
  weekday?: number;
};

/** The four posts (Collins, 23 Nov 2026), in the order they go out. */
export const POSTS: Record<PostKind, PostSlot> = {
  "daily-on": { label: "The Daily is on", hour: 9 },
  team: { label: "Team of the week", hour: 10, weekday: 1 },
  clash: { label: "Clash dare", hour: 18, weekday: 3 },
  "full-time": { label: "Full time", hour: 22 },
};

export const POST_KINDS = Object.keys(POSTS) as PostKind[];

export const isPostKind = (k: string): k is PostKind => (POST_KINDS as string[]).includes(k);

/** "09:00". */
export const postTime = (kind: PostKind) => `${String(POSTS[kind].hour).padStart(2, "0")}:00`;

const weekdayOf = (date: string) => new Date(`${date}T12:00:00Z`).getUTCDay();

/** The posts due on a day, in time order. */
export function postsOn(date: string): PostKind[] {
  const day = weekdayOf(date);
  return POST_KINDS.filter((k) => POSTS[k].weekday === undefined || POSTS[k].weekday === day);
}

/** The hour now on the game clock (WAT). */
export function gameHour(at: Date = new Date()): number {
  return (at.getUTCHours() + GAME_UTC_OFFSET_HOURS) % 24;
}

/** How a post stands: posted or skipped by hand, not due yet, nothing to say, or ready. */
export type PostState = "posted" | "skipped" | "later" | "empty" | "ready";

export function postState(kind: PostKind, o: { status: "posted" | "skipped" | null; hour: number; hasWords: boolean }): PostState {
  if (o.status) return o.status;
  if (o.hour < POSTS[kind].hour) return "later";
  return o.hasWords ? "ready" : "empty";
}

const clean = (url: string) => url.replace(/^https?:\/\//, "").replace(/\/$/, "");

/** 09:00: today's Daily, both halves' questions and the link. */
export function dailyOnWords(d: { fixture: string; first: string; second: string | null; siteUrl: string }): string {
  return [
    `Today's Daily: ${d.fixture}.`,
    "",
    `1st half: ${d.first}`,
    ...(d.second ? [`2nd half: ${d.second}`] : []),
    "",
    `Free, 2 minutes, no sign-up. ${clean(d.siteUrl)}/daily`,
  ].join("\n");
}

/** Mondays 10:00: last week's team of the week. */
export function teamWords(d: { week: string; top: { name: string; points: number } | null; players: number; siteUrl: string }): string | null {
  if (!d.top) return null;
  return [
    `${d.week}'s team of the week.`,
    "",
    `${d.top.name} top with ${d.top.points} out of 600. ${d.players} played.`,
    "",
    `Think you know ball? Make the XI. ${clean(d.siteUrl)}`,
  ].join("\n");
}

/** Wednesdays 18:00: the week's best sprint so far, as a dare. */
export function clashWords(d: { name: string; right: number; code: string; siteUrl: string }): string {
  return [
    `${d.name} called ${d.right} right in 60 seconds of higher or lower.`,
    "",
    `Same players, same order, one go. Beat ${d.right}.`,
    `${clean(d.siteUrl)}/clash/${d.code}`,
  ].join("\n");
}

/** 22:00: how today's Daily went, and that it's still open till midnight. */
export function fullTimeWords(d: {
  fixture: string;
  players: number;
  top: { name: string; points: number } | null;
  gotAway: { name: string; missed: number } | null;
  siteUrl: string;
}): string | null {
  if (!d.top) return null;
  return [
    `Full time on ${d.fixture}.`,
    "",
    `${d.players} played. ${d.top.name} top with ${d.top.points}.`,
    ...(d.gotAway ? [`The one that got away: ${d.gotAway.name}. ${d.gotAway.missed} in 10 missed him.`] : []),
    "",
    `The Daily closes at midnight. ${clean(d.siteUrl)}/daily`,
  ].join("\n");
}

/** The answer the fewest found, with how many in 10 missed it; null with too few to say. */
export function gotAway(answers: { name: string; found: number }[], players: number): { name: string; missed: number } | null {
  if (players < 5 || !answers.length) return null;
  const least = answers.reduce((a, b) => (b.found < a.found ? b : a));
  const missed = Math.round((10 * (players - least.found)) / players);
  return missed >= 5 ? { name: least.name, missed } : null;
}

/** X counts every link as 23 characters, whatever its length. */
const LINK = /\b(?:https?:\/\/)?(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/\S*)?/gi;
export const X_LIMIT = 280;
export function xLength(text: string): number {
  return [...text.replace(LINK, "x".repeat(23))].length;
}

/** X's compose box with the words in: free, no API. It can't carry a picture. */
export function intentUrl(words: string): string {
  return `https://x.com/intent/post?text=${encodeURIComponent(words)}`;
}

/** The buzz to Collins's phone when posts are ready (the whistle, admins only). */
export function postBuzz(kinds: PostKind[]): { title: string; body: string; url: string; tag: string } | null {
  if (!kinds.length) return null;
  const list = kinds.map((k) => `${postTime(k)} ${POSTS[k].label}`).join(" · ");
  return {
    title: kinds.length === 1 ? `${POSTS[kinds[0]].label} is ready to post` : `${kinds.length} posts ready today`,
    body: list,
    url: "/maker/posts",
    tag: "posts",
  };
}
