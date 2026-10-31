"use client";

import { useActionState } from "react";
import { signIn } from "@/app/maker/actions";
import { SubmitButton } from "@/components/daily/SubmitButton";

export function LoginForm() {
  const [state, action] = useActionState(signIn, null);

  return (
    <form action={action} className="mt-1 grid gap-3">
      <label className="grid gap-1.5">
        <span className="label text-[10px]">Email</span>
        <input key={state?.email} name="email" type="email" defaultValue={state?.email} autoComplete="username" required className="border-2 border-navy px-2.5 py-2" />
      </label>
      <label className="grid gap-1.5">
        <span className="label text-[10px]">Password</span>
        <input name="password" type="password" autoComplete="current-password" required className="border-2 border-navy px-2.5 py-2" />
      </label>
      <p role="alert" className="min-h-5 text-sm font-semibold text-red-card">
        {state?.error}
      </p>
      <SubmitButton pendingText="Checking…" tone="teal">Sign in</SubmitButton>
    </form>
  );
}
