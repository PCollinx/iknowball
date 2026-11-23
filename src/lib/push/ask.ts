import type { InstallWay } from "@/lib/pwa/platform";

// The full-time ask (Collins, 23 Nov 2026, option B "Fourth official" of
// https://claude.ai/artifact/LN2kK5yVvQCZ4SVxVggzjN): a pop-up after a Daily
// or a Clash sprint. On a phone in the browser it asks to save iKnowBall on
// the home screen first; from the home screen, or on a laptop (no phone to
// save it on), it asks to turn on the whistle. Pure, so it's tested.

/** "install": the browser's own Install (Android). "ios": the Share steps. */
export type Ask = "install" | "ios" | "whistle";

type Seen = {
  /** A phone or tablet (`isPhone`). */
  phone: boolean;
  /** `useInstall().way`, null until the page is up. */
  way: InstallWay | null;
  /** `useWhistle().state.kind`. */
  whistle: "loading" | "unsupported" | "install" | "blocked" | "off" | "on";
};

/** What to ask, null for nothing, "wait" while the browser is still being read. */
export function whatToAsk({ phone, way, whistle }: Seen): Ask | null | "wait" {
  if (way === null) return "wait";
  if (phone && way !== "installed") return way === "prompt" ? "install" : way === "ios" ? "ios" : null;
  if (whistle === "loading") return "wait";
  return whistle === "off" ? "whistle" : null;
}

export type Game = "daily" | "clash";

export type AskCopy = { on: string; off: string; title: string; line: string; button: string };

/** The board's two names, then the white card's words. `score` is the Clash score to beat. */
export function askCopy(ask: Ask, game: Game, score: number): AskCopy {
  const yours = score > 0 ? `your ${score}` : "your score";
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
