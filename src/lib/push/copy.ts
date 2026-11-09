import { ordinal } from "@/components/daily/formats";
import { headlineFixture } from "@/components/daily/fixture";

// The whistle's words (Collins, 7 Nov 2026, the copy on
// https://claude.ai/artifact/AGqN4hg5iztkWXatKnGwab). Pure, so it's tested.

export type Buzz = { title: string; body: string; url: string; tag: string };

/** Lock screens cut long lines; keep the body to about two lines. */
const BODY_MAX = 120;

function clip(text: string): string {
  if (text.length <= BODY_MAX) return text;
  const cut = text.slice(0, BODY_MAX - 1);
  return `${cut.slice(0, cut.lastIndexOf(" ")).replace(/[,.;:]$/, "")}…`;
}

/** 09:00 WAT: today's Daily is up. */
export function dailyUp(daily: { title: string; prompt: string }): Buzz {
  return {
    title: `${headlineFixture(daily.title)} is on`,
    body: clip(`${daily.prompt.trim().replace(/[.?!]?$/, ".")} Clock starts when you do.`),
    url: "/daily",
    tag: "daily",
  };
}

/** 20:00 WAT, for anyone yet to play today: the Daily closes at midnight. */
export function dailyClosing(daily: { title: string }, streak: number): Buzz {
  const fixture = headlineFixture(daily.title);
  return {
    title: "4 hours left on today's Daily",
    body: streak >= 2 ? `Your ${streak}-day streak goes at midnight. ${fixture} is waiting.` : `${fixture} closes at midnight.`,
    url: "/daily",
    tag: "daily",
  };
}

/** The moment a mate finishes a challenge you set. */
export function challengePlayed(c: { name: string; theirs: number; mine: number; stat: string; code: string }): Buzz {
  const on = `${c.theirs} right on ${c.stat}.`;
  const [title, body] =
    c.theirs > c.mine
      ? [`${c.name} beat your ${c.mine}`, `${on} Settle it.`]
      : c.theirs === c.mine
        ? [`${c.name} matched your ${c.mine}`, `${on} Level. Settle it.`]
        : [`${c.name} couldn't beat your ${c.mine}`, `${on} Your ${c.mine} stands.`];
  return { title, body, url: `/clash/${c.code}`, tag: `clash-${c.code}` };
}

/** Monday 09:00 WAT: how last week finished in your league. */
export function leagueWeek(l: { name: string; code: string; position: number; points: number; leader: { name: string; points: number } | null }): Buzz {
  const gap = l.leader ? l.leader.points - l.points : 0;
  const where = l.position === 1 || !l.leader ? "top of the table" : gap === 0 ? `level with ${l.leader.name}` : `${gap} behind ${l.leader.name}`;
  return {
    title: `${l.name}: you finished ${ordinal(l.position)}`,
    body: `${l.points} points, ${where}. New week, Daily's on.`,
    url: `/league/${l.code}`,
    tag: "daily",
  };
}
