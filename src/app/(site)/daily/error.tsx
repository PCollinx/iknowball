"use client";

import { ErrorScreen } from "@/components/errors/ErrorScreen";

export default function DailyError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <ErrorScreen
      error={error}
      retry={retry}
      line="The Daily didn't load."
      safe="Your attempt is safe on our side: the clock is the server's, so nothing's lost."
    />
  );
}
