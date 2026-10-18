"use client";

import { useActionState } from "react";
import { saveWithEmail, setPassword, setUsername, signInWithEmail, signInWithPassword, type FormState } from "@/app/profile/actions";

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
        <button type="submit" disabled={pending} className={button}>
          {pending ? "…" : "Save"}
        </button>
      </div>
      <Message state={state} />
    </form>
  );
}

const boxInput = "mt-1.5 block w-full border-2 border-navy p-3 text-lg";

/** A full-width button like Google's that opens its form; works without JavaScript. */
function Drawer({ label, open, children }: { label: string; open: boolean; children: React.ReactNode }) {
  return (
    // Kept open once there's a message, or a re-render would fold it away.
    <details open={open || undefined} className="group border-2 border-navy open:p-3">
      <summary className="cursor-pointer list-none p-3 text-center font-display text-2xl uppercase group-open:p-0 group-open:pb-1 group-open:text-left group-open:text-lg [&::-webkit-details-marker]:hidden">
        {label}
      </summary>
      {children}
    </details>
  );
}

/** Saves a guest's account in place by email link (same id, so every Daily stays). */
export function SaveWithEmailForm() {
  const [state, action, pending] = useActionState(saveWithEmail, null);
  const sent = Boolean(state && "ok" in state);
  return (
    <Drawer label="Save with email" open={state !== null}>
      <form action={action}>
        <label className="label" htmlFor="email-save">
          Your email
        </label>
        <input id="email-save" name="email" type="email" autoComplete="email" required placeholder="you@example.com" className={boxInput} />
        <button type="submit" disabled={pending} className={`mt-2 w-full py-3 ${button}`}>
          {pending ? "Sending…" : sent ? "Send again" : "Email me a link"}
        </button>
        <p className="mt-1.5 text-sm text-navy/70">Open the link to save your shirt, then set a password here.</p>
        <Message state={state} />
      </form>
    </Drawer>
  );
}

/** Email and password, with an email link for a forgotten password. */
export function SignInWithEmailForm() {
  const [state, action, pending] = useActionState(signInWithPassword, null);
  const [linkState, linkAction, linkPending] = useActionState(signInWithEmail, null);
  return (
    <Drawer label="Sign in with email" open={state !== null || linkState !== null}>
      <form action={action}>
        <label className="label" htmlFor="email-signin">
          Your email
        </label>
        <input
          id="email-signin"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
          defaultValue={state && "email" in state ? state.email : undefined}
          className={boxInput}
        />
        <label className="label mt-3 block" htmlFor="password-signin">
          Password
        </label>
        <input id="password-signin" name="password" type="password" autoComplete="current-password" className={boxInput} />
        <button type="submit" disabled={pending || linkPending} className={`mt-2 w-full py-3 ${button}`}>
          {pending ? "Signing in…" : "Sign in"}
        </button>
        <Message state={state} />
        <button
          type="submit"
          formAction={linkAction}
          formNoValidate
          disabled={pending || linkPending}
          className="text-sm font-semibold underline underline-offset-4"
        >
          {linkPending ? "Sending…" : "Forgot it? Email me a sign-in link"}
        </button>
        <Message state={linkState} />
      </form>
    </Drawer>
  );
}

/** Sets or changes the password on a saved account. */
export function PasswordForm() {
  const [state, action, pending] = useActionState(setPassword, null);
  return (
    <form action={action}>
      <label className="label" htmlFor="password-new">
        Password
      </label>
      <div className="mt-1.5 flex gap-2">
        <input
          id="password-new"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          maxLength={72}
          required
          placeholder="8 characters or more"
          className={input}
        />
        <button type="submit" disabled={pending} className={button}>
          {pending ? "…" : "Save"}
        </button>
      </div>
      <Message state={state} />
    </form>
  );
}
