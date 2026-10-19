"use client";

import { useState } from "react";

/** Sends a link: the phone's share sheet, else a copy to the clipboard. */
export function ChallengeButton({ url, text, label = "Send the challenge" }: { url: string; text: string; label?: string }) {
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
      <button type="button" onClick={send} className="w-full bg-royal p-3.5 font-display text-[28px] text-white uppercase">
        {label}
      </button>
      <p role="status" className="min-h-[22px] pt-1 text-[15px] font-semibold text-royal">
        {note}
      </p>
    </>
  );
}
