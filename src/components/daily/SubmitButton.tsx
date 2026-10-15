"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({ children, pendingText }: { children: React.ReactNode; pendingText: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full bg-royal p-3.5 font-display text-[28px] text-white uppercase disabled:bg-track disabled:text-navy/60"
    >
      {pending ? pendingText : children}
    </button>
  );
}
