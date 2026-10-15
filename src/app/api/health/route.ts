import { connection, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { gameDate } from "@/lib/time";

// Setup check: is the env configured and can we reach the database?
export async function GET() {
  await connection();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const checks: Record<string, boolean | string> = {
    gameDate: gameDate(),
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? false,
    supabaseConfigured: Boolean(url && key),
    serviceRoleConfigured: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    highlightlyConfigured: Boolean(process.env.HIGHLIGHTLY_API_KEY),
    // Public keys are baked in at build time, so these show what the live build got.
    posthogConfigured: Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY),
    sentryConfigured: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local",
    database: false,
  };
  if (url && key) {
    const { error } = await createClient(url, key).from("clubs").select("id", { head: true, count: "exact" });
    checks.database = error ? error.message : true;
  }
  const ok = checks.supabaseConfigured && checks.database === true;
  return NextResponse.json(checks, { status: ok ? 200 : 503 });
}
