// How this browser can put iKnowBall on the home screen (step 16).

/** "installed": already opened from the home screen. "prompt": the browser
 * offered its own install (Chrome and Edge on Android and desktop). "ios":
 * iPhone and iPad, where it's done by hand from the Share menu. "none": a
 * browser that can't, or one where it's already installed. */
export type InstallWay = "installed" | "prompt" | "ios" | "none";

type Browser = { ua: string; touchPoints: number; standalone: boolean; prompt: boolean };

/** iPadOS asks for desktop pages and says it's a Mac: only the touch screen gives it away. */
export function isIos(ua: string, touchPoints: number): boolean {
  return /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && touchPoints > 1);
}

/** X, WhatsApp, Instagram and Facebook open links in a browser of their own,
 * which can't add to the home screen. */
export function inAppBrowser(ua: string): boolean {
  return /Twitter|WhatsApp|Instagram|FBAN|FBAV|FB_IAB|Line\//i.test(ua);
}

export function installWay({ ua, touchPoints, standalone, prompt }: Browser): InstallWay {
  if (standalone) return "installed";
  if (prompt) return "prompt";
  if (isIos(ua, touchPoints)) return "ios";
  return "none";
}

/** "Not now" on the full-time ticket keeps it away this long. */
export const NOT_NOW_DAYS = 14;

export function ticketDue(dismissedAt: number | null, now: number): boolean {
  return dismissedAt === null || now - dismissedAt >= NOT_NOW_DAYS * 86_400_000;
}
