"use client";

import { useEffect } from "react";

// Last-resort error screen when the root layout itself fails. Reports to Sentry.
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    // Imported here, not at the top, so Sentry stays out of the first-load bundle.
    import("@sentry/nextjs").then((Sentry) => Sentry.captureException(error));
  }, [error]);

  return (
    <html lang="en">
      <body>
        <main style={{ maxWidth: 420, margin: "20vh auto", padding: "0 16px", fontFamily: "system-ui, sans-serif" }}>
          <h1>Something went wrong</h1>
          <p>We&apos;ve been told about it. Please refresh and try again.</p>
        </main>
      </body>
    </html>
  );
}
