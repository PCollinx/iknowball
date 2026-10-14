// Product analytics. posthog-js is about 100 KB gzipped, so it loads after the
// page is interactive instead of in the first-load bundle (budget: ~200 KB).
// Events go through our own /ingest path (see the rewrites in next.config.ts)
// so ad blockers don't drop them. Autocapture, web vitals and the
// session-recording switch are set in the PostHog project settings.
const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com";

function loadPostHog(key: string) {
  import("posthog-js").then(({ default: posthog }) => {
    posthog.init(key, {
      api_host: "/ingest",
      ui_host: host.replace(".i.posthog.com", ".posthog.com"),
      defaults: "2026-08-30",
    });
  });
}

if (key) {
  if ("requestIdleCallback" in window) {
    requestIdleCallback(() => loadPostHog(key), { timeout: 3000 });
  } else {
    setTimeout(() => loadPostHog(key), 1500);
  }
}
