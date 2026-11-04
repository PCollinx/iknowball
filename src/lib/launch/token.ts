import { createHmac, timingSafeEqual } from "node:crypto";

// A waitlist row's own link token, for the launch email's hero image and its
// unsubscribe link: the row's id plus a signature, so the links carry no email
// or name and nobody can guess another row's. Signed with CRON_SECRET.

const sign = (id: number, secret: string) => createHmac("sha256", secret).update(`waitlist:${id}`).digest("base64url").slice(0, 22);

export function waitlistToken(id: number, secret: string): string {
  return `${id}-${sign(id, secret)}`;
}

/** The row's id, or null when the token isn't one we made. */
export function readWaitlistToken(token: string, secret: string): number | null {
  const m = /^(\d{1,12})-([A-Za-z0-9_-]{22})$/.exec(token);
  if (!m) return null;
  const id = Number(m[1]);
  const want = Buffer.from(sign(id, secret));
  const given = Buffer.from(m[2]);
  return want.length === given.length && timingSafeEqual(want, given) ? id : null;
}
