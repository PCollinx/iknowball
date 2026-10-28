// The waitlist window (Collins, 27 Oct 2026, option A): from 1 Nov until the
// gates open on launch day, playiknowball.com shows the waitlist instead of the
// games. Beta testers get through with the invite link, /beta/{BETA_CODE},
// which leaves a cookie in their browser. Times are midnight WAT, like the Daily.

export const WAITLIST_OPENS = new Date("2026-11-01T00:00:00+01:00");
export const GATES_OPEN = new Date("2026-11-20T00:00:00+01:00");

/** "Fri 20 Nov", for the page. */
export const GATES_OPEN_LABEL = "Fri 20 Nov";

export const BETA_COOKIE = "ikb_beta";

export function waitlistUp(at: Date = new Date()): boolean {
  return at >= WAITLIST_OPENS && at < GATES_OPEN;
}

/** The games' screens, which the waitlist stands in for. Share-card images
 * stay open, so a beta tester's shared card still shows in a post. */
export function gated(pathname: string): boolean {
  if (pathname.endsWith("/card")) return false;
  return pathname === "/" || /^\/(daily|clash|league|profile)(\/|$)/.test(pathname);
}

/** The invite code is the cookie's value, so changing BETA_CODE shuts out
 * every old invite. A code under 8 characters counts as not set. */
export function betaPass(cookie: string | undefined, code: string | undefined): boolean {
  return Boolean(code && code.length >= 8 && cookie === code);
}
