"use client";

import { useActionState } from "react";
import { saveWithEmail, setUsername, signInWithEmail, type FormState } from "@/app/profile/actions";

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

/** Email link: saves a guest's account in place, or signs in. */
export function EmailForm({ mode }: { mode: "save" | "signin" }) {
  const [state, action, pending] = useActionState(mode === "save" ? saveWithEmail : signInWithEmail, null);
  return (
    <form action={action}>
      <label className="label" htmlFor={`email-${mode}`}>
        {mode === "save" ? "Or with your email" : "Sign in with your email"}
      </label>
      <div className="mt-1.5 flex gap-2">
        <input id={`email-${mode}`} name="email" type="email" autoComplete="email" required className={input} />
        <button type="submit" disabled={pending} className={button}>
          {pending ? "…" : "Send link"}
        </button>
      </div>
      <Message state={state} />
    </form>
  );
}
