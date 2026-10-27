import "server-only";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { isTestSite } from "@/lib/daily/sample";

// Test sites only: pages that break on purpose, so Collins can see each error
// screen (step 11). /oops (any page), /daily/oops (the Daily's) and /crash
// (the last-resort one). Production 404s. Remove once tested.

/** Breaks once the request is in, inside Suspense so the build can prerender
 * the page's shell (cacheComponents). */
export function BreakOnPurpose({ where }: { where: string }) {
  return (
    <Suspense>
      <Break where={where} />
    </Suspense>
  );
}

async function Break({ where }: { where: string }): Promise<never> {
  await connection();
  if (!isTestSite()) notFound();
  throw new Error(`Test: ${where} broke on purpose`);
}
