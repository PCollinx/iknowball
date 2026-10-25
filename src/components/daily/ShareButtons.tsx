"use client";

import { useEffect, useRef, useState } from "react";

type Image = { url: string; name: string };

/** The card as an image: the share sheet on phones (with the result as its
 * text), a download on desktop. The only share button (Collins, 19 Oct 2026). */
export function ShareButtons({ text, image, className = "mt-4" }: { text: string; image: Image | null; className?: string }) {
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

  if (!image) return null;
  return (
    <div>
      <button
        type="button"
        onClick={shareImage}
        className={`btn-white btn-press ${className} mb-1 flex w-full items-center justify-between px-4 py-3 font-display text-[24px] uppercase lg:text-[26px]`}
      >
        <span>
          Share the <span className="sash-mark">card</span>
        </span>
        <span aria-hidden="true">↗</span>
      </button>
      <p role="status" className="min-h-[22px] text-[15px] font-semibold text-royal">
        {note}
      </p>
    </div>
  );
}
