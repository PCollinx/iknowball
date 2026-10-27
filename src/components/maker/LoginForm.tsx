"use client";

import { useActionState } from "react";
import { signIn } from "@/app/maker/actions";
import { SubmitButton } from "@/components/daily/SubmitButton";

export function LoginForm() {
  const [state, action] = useActionState(signIn, null);

  return (
    <form action={action} className="mt-6 grid gap-4">
      <label className="grid gap-1.5">
        <span className="label">Email</span>
        <input key={state?.email} name="email" type="email" defaultValue={state?.email} autoComplete="username" required className="border-2 border-navy p-3 text-lg" />
      </label>
      <label className="grid gap-1.5">
        <span className="label">Password</span>
        <input name="password" type="password" autoComplete="current-password" required className="border-2 border-navy p-3 text-lg" />
      </label>
      <p role="alert" className="min-h-[22px] font-semibold text-red-card">
        {state?.error}
      </p>
      <SubmitButton pendingText="Checking…" tone="teal">Sign in</SubmitButton>
    </form>
  );
}
