"use client";

import { ErrorScreen } from "@/components/errors/ErrorScreen";
import { fontVariables } from "./fonts";
import "./globals.css";

// Last-resort error screen when the root layout itself fails, so there's no
// navbar or footer: the VAR's technical fault on its own. Reports to Sentry.
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="en" className={fontVariables}>
      <body className="flex min-h-dvh flex-col antialiased">
        <title>Something went off · iKnowBall</title>
        <ErrorScreen error={error} retry={retry} line="iKnowBall didn't load." safe="Your scores are safe on our side." hardLink />
      </body>
    </html>
  );
}
