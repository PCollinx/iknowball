"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/daily/SubmitButton";
import { PRIVACY_EMAIL } from "@/lib/site";
import { unsubscribeAction } from "./actions";
import { Check } from "@/components/icons/Icon";

export function UnsubscribeForm({ token }: { token: string }) {
  const [state, action] = useActionState(unsubscribeAction, null);
  if (state?.done)
    return (
      <p className="mt-5 inline-block -rotate-1 border-[3px] border-navy bg-teal-light px-4 py-2 font-display text-3xl uppercase shadow-[5px_5px_0_var(--color-navy)]">
        You&apos;re off the list <Check />
      </p>
    );
  return (
    <form action={action} className="mt-5 grid gap-3">
      <input type="hidden" name="token" value={token} />
      <SubmitButton pendingText="Taking you off…">Unsubscribe</SubmitButton>
      {state?.error && (
        <p className="font-semibold text-red-card">
          {state.error}
          {PRIVACY_EMAIL && ` ${PRIVACY_EMAIL}`}
        </p>
      )}
    </form>
  );
}
