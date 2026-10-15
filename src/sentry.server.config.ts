import * as Sentry from "@sentry/nextjs";

// Server-side error tracking (route handlers, server components, server actions).
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
  environment: process.env.VERCEL_ENV ?? "development",
  tracesSampleRate: 0,
});
