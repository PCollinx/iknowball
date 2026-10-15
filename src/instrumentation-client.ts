// Error tracking. The Sentry browser SDK is ~38 KB gzipped, which would push
// first-load JS past the ~200 KB budget, so it loads once the browser is idle.
// Errors thrown before then are held here and sent once it has loaded.
// Errors only (no tracing or replay). Reports go through /monitoring on our
// own domain (tunnelRoute in next.config.ts) so ad blockers don't drop them.
const sentryDsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
const earlyErrors: unknown[] = [];

function holdError(event: ErrorEvent | PromiseRejectionEvent) {
  earlyErrors.push("reason" in event ? event.reason : (event.error ?? event.message));
}

function loadSentry(dsn: string) {
  import("@sentry/nextjs").then((Sentry) => {
    Sentry.init({
      dsn,
      environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? "development",
      tracesSampleRate: 0,
    });
    window.removeEventListener("error", holdError);
    window.removeEventListener("unhandledrejection", holdError);
    earlyErrors.splice(0).forEach((error) => Sentry.captureException(error));
  });
}

function whenIdle(task: () => void, fallbackMs: number) {
  if ("requestIdleCallback" in window) {
    requestIdleCallback(task, { timeout: fallbackMs * 2 });
  } else {
    setTimeout(task, fallbackMs);
  }
}

if (sentryDsn) {
  window.addEventListener("error", holdError);
  window.addEventListener("unhandledrejection", holdError);
  whenIdle(() => loadSentry(sentryDsn), 1000);
}

// Product analytics. posthog-js is about 100 KB gzipped, so it loads after the
// page is interactive instead of in the first-load bundle (budget: ~200 KB).
// Events go through our own /ingest path (see the rewrites in next.config.ts)
// so ad blockers don't drop them. Autocapture, web vitals and the
// session-recording switch are set in the PostHog project settings.
const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com";

function loadPostHog(key: string) {
  import("posthog-js").then(({ default: posthog }) => {
    posthog.init(key, {
      api_host: "/ingest",
      ui_host: posthogHost.replace(".i.posthog.com", ".posthog.com"),
      defaults: "2026-08-30",
    });
  });
}

if (posthogKey) {
  whenIdle(() => loadPostHog(posthogKey), 1500);
}
