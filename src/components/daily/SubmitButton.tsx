"use client";

import { useFormStatus } from "react-dom";

/** The main action of a form. "royal" is the full-width sashed bar; "teal" is
 * the sticker button the Daily's kick-off uses (21 Oct 2026); "white" is the
 * one full time uses (22 Oct 2026); "navy" sits beside it on Clash's full
 * time (25 Oct 2026). */
export function SubmitButton({ children, pendingText, tone = "royal" }: { children: React.ReactNode; pendingText: string; tone?: "royal" | "teal" | "white" | "navy" }) {
  const { pending } = useFormStatus();
  const look =
    tone === "teal"
      ? "btn-teal btn-press flex items-center justify-between px-[18px] py-3.5 text-[30px] lg:px-5 lg:py-4 lg:text-[36px] disabled:translate-0 disabled:bg-track disabled:shadow-none"
      : tone === "white" || tone === "navy"
        ? `${tone === "white" ? "btn-white" : "btn-navy"} btn-press flex items-center justify-between px-4 py-3 text-[24px] lg:text-[26px] disabled:translate-0 disabled:bg-track disabled:text-navy/60 disabled:shadow-none`
        : "bg-royal sash p-3.5 text-[28px] text-white disabled:bg-track disabled:bg-none disabled:text-navy/60";
  return (
    <button type="submit" disabled={pending} className={`w-full font-display uppercase ${look}`}>
      {tone !== "royal" ? (
        <>
          <span>{pending ? pendingText : children}</span>
          <span aria-hidden="true">→</span>
        </>
      ) : pending ? (
        pendingText
      ) : (
        children
      )}
    </button>
  );
}
