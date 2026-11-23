import type { InstallWay } from "@/lib/pwa/platform";

// The full-time ask (Collins, 23 Nov 2026, option B "Fourth official" of
// https://claude.ai/artifact/LN2kK5yVvQCZ4SVxVggzjN): a pop-up after a Daily
// or a Clash sprint, one step at a time. A guest saves their shirt first, on
// any device (the home-screen app starts signed out, so installing first would
// lose their scores). Then, on a phone in the browser, it asks to save
// iKnowBall on the home screen; from the home screen, or on a laptop (no phone
// to save it on), it asks to turn on the whistle. Pure, so it's tested.

/** "shirt": a guest saves their account. "install": the browser's own Install (Android). "ios": the Share steps. */
export type Ask = "shirt" | "install" | "ios" | "whistle";

/** Not now is remembered per step, so dismissing one doesn't hold back the next. */
export type Step = "shirt" | "phone" | "whistle";
export const stepOf = (ask: Ask): Step => (ask === "install" || ask === "ios" ? "phone" : ask);

type Seen = {
  /** Playing as a guest (an anonymous account). */
  guest: boolean;
  /** A phone or tablet (`isPhone`). */
  phone: boolean;
  /** `useInstall().way`, null until the page is up. */
  way: InstallWay | null;
  /** `useWhistle().state.kind`. */
  whistle: "loading" | "unsupported" | "install" | "blocked" | "off" | "on";
};

/** What to ask, null for nothing, "wait" while the browser is still being read. */
export function whatToAsk({ guest, phone, way, whistle }: Seen): Ask | null | "wait" {
  if (guest) return "shirt";
  if (way === null) return "wait";
  if (phone && way !== "installed") return way === "prompt" ? "install" : way === "ios" ? "ios" : null;
  if (whistle === "loading") return "wait";
  return whistle === "off" ? "whistle" : null;
}

/** Test sites only (Collins, 23 Nov 2026): `?ask=shirt`, `?ask=install`,
 * `?ask=ios` or `?ask=whistle` shows that ask at full time whatever this
 * browser's state, Not now or not. `install` needs the browser's own offer to
 * do anything, and `shirt` only saves for a guest. */
export function forcedAsk(search: string, live: boolean): Ask | null {
  if (live) return null;
  const ask = new URLSearchParams(search).get("ask");
  return ask === "shirt" || ask === "whistle" || ask === "install" || ask === "ios" ? ask : null;
}

export type Game = "daily" | "clash";

/** A guest tapped Save with Google or Save with email in the pop-up: kept in
 * the browser so that, back on the site signed in, the next step shows at
 * once (Collins, 23 Nov 2026). A day at most: an email link opened later
 * than that just gets the usual full-time asks. */
export type PendingShirt = { game: Game; score: number; at: number };
export const PENDING_SHIRT_MS = 86_400_000;

export function readPendingShirt(raw: string | null, now: number): PendingShirt | null {
  try {
    const p = JSON.parse(raw ?? "null") as Partial<PendingShirt> | null;
    if (!p || (p.game !== "daily" && p.game !== "clash") || typeof p.score !== "number" || typeof p.at !== "number") return null;
    return now - p.at <= PENDING_SHIRT_MS ? { game: p.game, score: p.score, at: p.at } : null;
  } catch {
    return null;
  }
}

export type AskCopy = { on: string; off: string; title: string; line: string; button: string; keeps?: string[] };

/** The board's two names, then the white card's words. `score` is the day's score or the Clash score to beat; `phone` says which device the shirt is kept on. */
export function askCopy(ask: Ask, game: Game, score: number, phone = true): AskCopy {
  const yours = score > 0 ? `your ${score}` : "your score";
  if (ask === "shirt") {
    const what = score > 0 ? `Your ${score} is` : "What you've played is";
    return {
      on: "Your shirt",
      off: "Guest",
      title: "Save your shirt",
      line: `${what} only on this ${phone ? "phone" : "browser"} for now. Save your shirt and keep:`,
      keeps:
        game === "daily"
          ? [score > 0 ? `Your ${score} and your streak` : "Your scores and your streak", "Your rating and tier", "Your leagues, on any phone"]
          : [score > 0 ? `Your ${score} and this week's three` : "This week's three sprints", "The challenges you've sent", "Your leagues, on any phone"],
      button: "Save with Google",
    };
  }
  if (ask === "whistle")
    return game === "daily"
      ? {
          on: "The whistle",
          off: "Missing kick-off",
          title: "Don't miss kick-off",
          line: "A buzz when the Daily's up, a nudge at 20:00 if you haven't played, and one when a mate beats your challenge.",
          button: "Turn on",
        }
      : {
          on: "The whistle",
          off: "Finding out late",
          title: "Know when they play",
          line: `A buzz the moment a mate takes on ${yours}, when the Daily's up each morning, and at 20:00 if you haven't played.`,
          button: "Turn on",
        };
  return {
    on: "Home screen",
    off: "Browser tab",
    title: "Save it on your phone",
    line:
      ask === "ios"
        ? "iPhone only buzzes for apps on your home screen. Put iKnowBall there first:"
        : game === "daily"
          ? "iKnowBall on your home screen, like an app: tomorrow's Daily is one tap away. Then we can blow the whistle when it's up."
          : `Put iKnowBall on your home screen, then we can buzz you the moment a mate takes on ${yours}.`,
    button: ask === "ios" ? "Got it" : "Add to home screen",
  };
}

/** What the card says once it's done. */
export function doneCopy(ask: "install" | "whistle", game: Game): { title: string; line: string } {
  if (ask === "install") return { title: "Saved on your phone", line: "Play from your home screen next time. We'll ask about the whistle there." };
  return {
    title: "Whistle's on",
    line: game === "daily" ? "First buzz when tomorrow's Daily is up. Change them on Your shirt." : "We'll buzz you when a mate plays. Change them on Your shirt.",
  };
}
