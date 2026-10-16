import "server-only";
import { timingSafeEqual } from "node:crypto";
import { serverEnv } from "@/lib/env";

/**
 * Job routes are called by Vercel Cron, which sends
 * "Authorization: Bearer <CRON_SECRET>". Anyone else gets a 401.
 */
export function isAuthorizedJob(request: Request): boolean {
  const expected = Buffer.from(`Bearer ${serverEnv().CRON_SECRET}`);
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  return given.length === expected.length && timingSafeEqual(given, expected);
}
