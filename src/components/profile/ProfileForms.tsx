"use client";

import { useActionState } from "react";
import { saveWithEmail, setUsername, signInWithEmail, type FormState } from "@/app/(site)/profile/actions";

function Message({ state }: { state: FormState }) {
  return (
    <p role="alert" className={`min-h-[24px] pt-1 font-semibold ${state && "error" in state ? "text-red-card" : "text-teal"}`}>
      {state && ("error" in state ? state.error : state.ok)}
    </p>
  );
}

const input = "min-w-0 flex-1 border-2 border-navy p-3 text-lg";
const button = "bg-royal px-4 font-display text-xl text-white uppercase disabled:bg-track disabled:text-navy/60";

export function UsernameForm({ current }: { current: string | null }) {
  const [state, action, pending] = useActionState(setUsername, null);
  return (
    <form action={action}>
      <label className="label" htmlFor="username">
        Name on your shirt
      </label>
      <div className="mt-1.5 flex gap-2">
        <input
          id="username"
          name="username"
          defaultValue={current ?? ""}
          placeholder="e.g. Pitchside_Tunde"
          autoComplete="nickname"
          minLength={3}
          maxLength={20}
          pattern="[A-Za-z0-9_]{3,20}"
          required
          className={input}
        />
        <button type="submit" disabled={pending} className="btn-teal btn-press px-4 font-display text-xl uppercase disabled:translate-0 disabled:bg-track disabled:shadow-none">
          {pending ? "…" : "Save"}
        </button>
      </div>
      <Message state={state} />
    </form>
  );
}

/** Email link: saves a guest's account in place, or signs in. A white sticker
 * button like Google's that opens the address box; works without JavaScript. */
export function EmailForm({ mode }: { mode: "save" | "signin" }) {
  const [state, action, pending] = useActionState(mode === "save" ? saveWithEmail : signInWithEmail, null);
  const label = mode === "save" ? "Save with email" : "Sign in with email";
  const sent = Boolean(state && "ok" in state);
  return (
    <details className="group">
      <summary className="btn-white btn-press flex cursor-pointer list-none items-center justify-between px-4 py-3 font-display text-[22px] uppercase [&::-webkit-details-marker]:hidden">
        {label}
        <span aria-hidden="true" className="transition-transform group-open:rotate-90">
          →
        </span>
      </summary>
      <form action={action} className="mt-3 border-2 border-navy p-3">
        <label className="label" htmlFor={`email-${mode}`}>
          Your email
        </label>
        <input
          id={`email-${mode}`}
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
          className="mt-1.5 block w-full border-2 border-navy p-3 text-lg"
        />
        <button type="submit" disabled={pending} className={`mt-2 w-full py-3 ${button}`}>
          {pending ? "Sending…" : sent ? "Send again" : "Email me a sign-in link"}
        </button>
        <p className="mt-1.5 text-sm text-navy/70">No password. Tap the link we send and you&apos;re in.</p>
        <Message state={state} />
      </form>
    </details>
  );
}
