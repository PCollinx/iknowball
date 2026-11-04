"use client";

import { useActionState } from "react";
import { sendTestEmail, type TestEmailState } from "@/app/maker/actions";

/** Sends the launch email to the signed-in admin, as a test. */
export function TestEmail() {
  const [state, action, sending] = useActionState<TestEmailState, FormData>(sendTestEmail, null);
  return (
    <form action={action} className="grid gap-1.5">
      <button type="submit" disabled={sending} className="btn-white btn-press flex items-center justify-between px-3.5 py-1.5 font-display text-lg uppercase disabled:opacity-50">
        <span>{sending ? "Sending" : "Send me a test"}</span>
        <span aria-hidden>→</span>
      </button>
      <p aria-live="polite" className="text-[13px] font-semibold">
        {state && !sending && (state.ok ? <span className="text-royal">Sent to {state.to}.</span> : <span className="text-red-card">{state.error}</span>)}
      </p>
    </form>
  );
}
