import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

// PostHog is reached through /ingest on our own domain (see
// src/instrumentation-client.ts), so ad blockers don't drop analytics.
const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com";
const posthogAssetsHost = posthogHost.replace(".i.posthog.com", "-assets.i.posthog.com");

const nextConfig: NextConfig = {
  skipTrailingSlashRedirect: true,
  async rewrites() {
    return [
      { source: "/ingest/static/:path*", destination: `${posthogAssetsHost}/static/:path*` },
      { source: "/ingest/:path*", destination: `${posthogHost}/:path*` },
    ];
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

// Uploads source maps to Sentry at build time when SENTRY_AUTH_TOKEN is set
// (Vercel); locally it is skipped. /monitoring forwards browser error reports.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  tunnelRoute: "/monitoring",
  // Errors only: drop tracing, replay and debug code from the browser bundle.
  bundleSizeOptimizations: {
    excludeDebugStatements: true,
    excludeTracing: true,
    excludeReplayIframe: true,
    excludeReplayShadowDom: true,
    excludeReplayWorker: true,
  },
});
