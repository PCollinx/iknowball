"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpRight } from "@/components/icons/Icon";
import { CardSheet, saveCard } from "@/components/share/CardSheet";

type Image = { url: string; name: string };

/** The card as an image: the share sheet on phones (with the result as its
 * text), a download on desktop. The only share button (Collins, 19 Oct 2026). */
export function ShareButtons({
  text,
  image,
  className = "mt-4",
  label = "Share the card",
  sub,
  tone = "white",
  preview = false,
}: {
  text: string;
  image: Image | null;
  className?: string;
  label?: string;
  /** A line under the label ("Can they beat 65?"). */
  sub?: string;
  tone?: "white" | "teal";
  /** Full time: the button opens the card first (CardSheet), and Send it shares it. */
  preview?: boolean;
}) {
  const [note, setNote] = useState("");
  const [peek, setPeek] = useState(false);
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
    setPeek(false);
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
    saveCard(f);
    setNote("Card saved. Post it and watch them try.");
  }

  async function savePicture() {
    setPeek(false);
    const f = await file.current;
    if (!f) return setNote("Couldn't draw the card. Try again.");
    saveCard(f);
    setNote("Card saved. Post it and watch them try.");
  }

  if (!image) return null;
  return (
    <div>
      <button
        type="button"
        onClick={preview ? () => setPeek(true) : shareImage}
        className={`btn-${tone} btn-press ${className} mb-1 flex w-full items-center justify-between px-4 py-3 text-left font-display text-[24px] uppercase lg:text-[26px]`}
      >
        <span>
          <span className="block leading-none">{label}</span>
          {sub && <span className="mt-1 block font-sans text-[13px] font-semibold normal-case">{sub}</span>}
        </span>
        <ArrowUpRight className="size-[0.75em]" />
      </button>
      <p role="status" className="min-h-[22px] text-[15px] font-semibold text-royal">
        {note}
      </p>
      {preview && (
        <CardSheet open={peek} src={image.url} alt="Your share card" message={text} onSend={shareImage} onSave={savePicture} onClose={() => setPeek(false)} />
      )}
    </div>
  );
}
