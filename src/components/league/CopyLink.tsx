"use client";

import { useState } from "react";

/** The invite link in its dashed box: tap it to copy. */
export function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // No clipboard (an old browser or an insecure page): the link stays on screen to copy by hand.
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="my-2.5 flex w-full items-center justify-between gap-2 border-2 border-dashed border-royal p-2 text-left text-[13px] font-semibold text-royal hover:bg-mist"
    >
      <span className="min-w-0 break-all">{url.replace(/^https?:\/\//, "")}</span>
      <span role="status" className="label shrink-0 text-[10px]">
        {copied ? "Copied ✓" : "Tap to copy"}
      </span>
    </button>
  );
}
