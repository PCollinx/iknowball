"use client";

import { useEffect, useRef, useState } from "react";

type Image = { url: string; name: string };

/** The card as an image first (the share sheet on phones, a download on
 * desktop), then WhatsApp (where the group chats are) and a plain copy. */
export function ShareButtons({ text, image }: { text: string; image: Image | null }) {
  const [note, setNote] = useState("");
  const file = useRef<Promise<File | null> | null>(null);
  const url = image?.url;
  const name = image?.name;

  // Drawn ahead of the tap: phones only open the share sheet straight from one.
  useEffect(() => {
    if (!url || !name) return;
    file.current = fetch(url)
      .then((r) => (r.ok ? r.blob() : null))
      .then((b) => (b ? new File([b], name, { type: "image/png" }) : null))
      .catch(() => null);
  }, [url, name]);

  async function shareImage() {
    const f = await file.current;
    if (!f) return setNote("Couldn't draw the card. Try again.");
    if (navigator.canShare?.({ files: [f] })) {
      try {
        await navigator.share({ files: [f], text });
      } catch (e) {
        if ((e as Error).name !== "AbortError") setNote("Couldn't open sharing on this browser.");
      }
      return;
    }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(f);
    a.download = f.name;
    a.click();
    URL.revokeObjectURL(a.href);
    setNote("Card saved. Post it and watch them try.");
  }

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
        {image && (
          <button type="button" onClick={shareImage} className={`${btn} col-span-2 bg-royal text-white`}>
            Share the card
          </button>
        )}
        <a
          className={`${btn} ${image ? "bg-white text-royal" : "bg-royal text-white"}`}
          href={`https://wa.me/?text=${encodeURIComponent(text)}`}
          target="_blank"
          rel="noreferrer"
        >
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
