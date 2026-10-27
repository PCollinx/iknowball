"use client";

import { ErrorScreen } from "@/components/errors/ErrorScreen";

// Any other screen in the site frame that fails: the navbar and footer stay.
export default function SiteError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <ErrorScreen error={error} retry={retry} line="This page didn't load." safe="Your scores are safe on our side." />;
}
