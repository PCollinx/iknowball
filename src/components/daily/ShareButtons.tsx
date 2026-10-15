"use client";

import { useState } from "react";

/** WhatsApp first (it's where the group chats are), then a plain copy. */
export function ShareButtons({ text }: { text: string }) {
  const [note, setNote] = useState("");
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setNote("Copied. Go and humble the group chat.");
    } catch {
      setNote("Couldn't copy on this browser.");
    }
  }
  const btn = "border-[3px] border-royal p-2.5 text-center font-display text-xl uppercase";
  return (
    <div>
      <div className="grid grid-cols-2 gap-2 pt-2 pb-1">
        <a className={`${btn} bg-royal text-white`} href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer">
          Share to WhatsApp
        </a>
        <button type="button" onClick={copy} className={`${btn} bg-white text-royal`}>
          Copy result
        </button>
      </div>
      <p role="status" className="min-h-[22px] text-[15px] font-semibold text-royal">
        {note}
      </p>
    </div>
  );
}
