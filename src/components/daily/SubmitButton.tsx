"use client";

import { useFormStatus } from "react-dom";

/** The main action of a form, as a sticker button: "teal" is the one the
 * Daily's kick-off uses (21 Oct 2026); "white" is the one full time uses
 * (22 Oct 2026); "navy" sits beside it on Clash's full time (25 Oct 2026).
 * The flat royal bar is retired (Collins, 27 Oct 2026). */
export function SubmitButton({ children, pendingText, tone = "teal" }: { children: React.ReactNode; pendingText: string; tone?: "teal" | "white" | "navy" }) {
  const { pending } = useFormStatus();
  const look =
    tone === "teal"
      ? "btn-teal btn-press px-[18px] py-3.5 text-[30px] lg:px-5 lg:py-4 lg:text-[36px] disabled:translate-0 disabled:bg-track disabled:shadow-none"
      : `${tone === "white" ? "btn-white" : "btn-navy"} btn-press px-4 py-3 text-[24px] lg:text-[26px] disabled:translate-0 disabled:bg-track disabled:text-navy/60 disabled:shadow-none`;
  return (
    <button type="submit" disabled={pending} className={`flex w-full items-center justify-between font-display uppercase ${look}`}>
      <span>{pending ? pendingText : children}</span>
      <span aria-hidden="true">→</span>
    </button>
  );
}
