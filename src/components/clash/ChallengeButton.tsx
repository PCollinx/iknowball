"use client";

import { useState } from "react";

/** Sends a link: the phone's share sheet, else a copy to the clipboard. "royal"
 * is the full-width sashed bar; "teal" is the sticker button with the code on
 * a navy tag (Clash full time, 25 Oct 2026). */
export function ChallengeButton({
  url,
  text,
  label = "Send the challenge",
  tone = "royal",
  code,
}: {
  url: string;
  text: string;
  label?: string;
  tone?: "royal" | "teal";
  code?: string;
}) {
  const [note, setNote] = useState("");

  async function send() {
    if (navigator.share) {
      try {
        await navigator.share({ text, url });
      } catch {
        // Closing the share sheet isn't an error.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(`${text} ${url}`);
      setNote("Link copied. Drop it in the group chat.");
    } catch {
      setNote(url);
    }
  }

  return (
    <>
      {tone === "teal" ? (
        <button
          type="button"
          onClick={send}
          className="btn-teal btn-press flex w-full items-center justify-between gap-2 px-3 py-2.5 font-display text-[22px] leading-none uppercase lg:px-3.5 lg:text-2xl"
        >
          <span>{label}</span>
          {code && <span className="bg-navy px-1.5 py-0.5 text-[13px] tracking-[0.08em] text-white lg:text-[15px]">{code}</span>}
        </button>
      ) : (
        <button type="button" onClick={send} className="w-full bg-royal sash p-3.5 font-display text-[28px] text-white uppercase">
          {label}
        </button>
      )}
      <p role="status" className="min-h-[22px] pt-1 text-[15px] font-semibold text-royal">
        {note}
      </p>
    </>
  );
}
