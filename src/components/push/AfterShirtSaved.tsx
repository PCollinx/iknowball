"use client";

import { useEffect, useState } from "react";
import { readPendingShirt } from "@/lib/push/ask";
import { PENDING_SHIRT, WhistleAsk } from "./WhistleAsk";

// Back from saving the shirt (Collins, 23 Nov 2026): a guest who tapped Save
// with Google or Save with email in the full-time pop-up lands on Your shirt
// signed in, and the pop-up's next step shows at once under "Shirt saved":
// save it on your phone in a phone's browser, the whistle on the home screen
// or a laptop. Shown once, then forgotten.

function readPending() {
  try {
    return readPendingShirt(window.localStorage.getItem(PENDING_SHIRT), Date.now());
  } catch {
    return null;
  }
}

export function AfterShirtSaved({ guest }: { guest: boolean }) {
  // Read once on the client; the server has no say (the pop-up draws nothing until it opens).
  const [pending] = useState(() => (typeof window === "undefined" ? null : readPending()));

  useEffect(() => {
    // Still a guest (the email link isn't tapped yet): keep it for when they are.
    if (!pending || guest) return;
    try {
      window.localStorage.removeItem(PENDING_SHIRT);
    } catch {
      // Storage blocked: nothing was kept anyway.
    }
  }, [pending, guest]);

  if (!pending || guest) return null;
  return <WhistleAsk game={pending.game} score={pending.score} guest={false} justSaved />;
}
