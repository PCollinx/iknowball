import { z } from "zod";

// Values the browser bundle may read. Next.js inlines NEXT_PUBLIC_* at build
// time, so each one has to be referenced by its full name here.
const publicSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
  NEXT_PUBLIC_POSTHOG_HOST: z.url().optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
});

const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  HIGHLIGHTLY_API_KEY: z.string().min(1),
  HIGHLIGHTLY_BASE_URL: z.url().default("https://soccer.highlightly.net"),
  HIGHLIGHTLY_PL_LEAGUE_ID: z.coerce.number().int().default(33973),
  HIGHLIGHTLY_SEASON: z.coerce.number().int().default(2026),
  CRON_SECRET: z.string().min(16),
});

export function publicEnv() {
  return publicSchema.parse({
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY || undefined,
    NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST || undefined,
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN || undefined,
  });
}

// Server only. Throws with the names of missing variables, which is what you
// want to see in a Vercel build log.
export function serverEnv() {
  if (typeof window !== "undefined") {
    throw new Error("serverEnv() was called in the browser");
  }
  return { ...publicEnv(), ...serverSchema.parse(process.env) };
}

/** Names of server variables that are missing or invalid (never their values). */
export function serverEnvProblems(): string[] {
  const result = serverSchema.safeParse(process.env);
  return result.success ? [] : [...new Set(result.error.issues.map((i) => i.path.join(".")))];
}
