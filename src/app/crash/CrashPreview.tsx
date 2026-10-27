"use client";

import { ErrorScreen } from "@/components/errors/ErrorScreen";

const ERROR = Object.assign(new Error("Test: the whole app broke on purpose"), { digest: "7f3a0c21" });

export function CrashPreview() {
  return <ErrorScreen error={ERROR} retry={() => location.reload()} line="iKnowBall didn't load." safe="Your scores are safe on our side." hardLink />;
}
