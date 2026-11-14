"use client";

import { useEffect, useRef, useState } from "react";
import { Arrow } from "@/components/icons/Icon";

type Image = { url: string; name: string };

/** Sends a link: the phone's share sheet, else a copy to the clipboard. A
 * light-teal sticker button, with the code on a navy tag when there is one
 * (Clash full time, 25 Oct 2026). With an image (Clash full time, 2 Nov 2026:
 * one button instead of "Send it" and "Share the card"), the card goes too,
 * with the link in the message; where a browser can't share files, the link
 * is copied and the card saved. */
export function ChallengeButton({
  url,
  text,
  label = "Send the challenge",
  code,
  image,
}: {
  url: string;
  text: string;
  label?: string;
  code?: string;
  image?: Image;
}) {
  const [note, setNote] = useState("");
  const file = useRef<Promise<File | null> | null>(null);
  const imageUrl = image?.url;
  const imageName = image?.name;

  // Drawn ahead of the tap: phones only open the share sheet straight from one.
  useEffect(() => {
    if (!imageUrl || !imageName) return;
    file.current = fetch(imageUrl)
      .then((r) => (r.ok ? r.blob() : null))
      .then((b) => (b ? new File([b], imageName, { type: "image/png" }) : null))
      .catch(() => null);
  }, [imageUrl, imageName]);

  async function send() {
    const card = file.current ? await file.current : null;
    if (card && navigator.canShare?.({ files: [card] })) {
      try {
        // The link rides in the text: some apps drop `url` when files are shared.
        await navigator.share({ files: [card], text: `${text} ${url}` });
      } catch {
        // Closing the share sheet isn't an error.
      }
      return;
    }
    if (navigator.share) {
      try {
        await navigator.share({ text, url });
      } catch {
        // Closing the share sheet isn't an error.
      }
      return;
    }
    if (card) save(card);
    try {
      await navigator.clipboard.writeText(`${text} ${url}`);
      setNote(card ? "Link copied and card saved. Post them both." : "Link copied. Drop it in the group chat.");
    } catch {
      setNote(url);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={send}
        className="btn-teal btn-press flex w-full items-center justify-between gap-2 px-3 py-2.5 font-display text-[22px] leading-none uppercase lg:px-3.5 lg:text-2xl"
      >
        <span className="min-w-0 truncate">{label}</span>
        {code ? <span className="bg-navy px-1.5 py-0.5 text-[13px] tracking-[0.08em] text-white lg:text-[15px]">{code}</span> : <Arrow />}
      </button>
      <p role="status" className="min-h-[22px] pt-1 text-[15px] font-semibold text-royal">
        {note}
      </p>
    </>
  );
}

function save(card: File) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(card);
  a.download = card.name;
  a.click();
  URL.revokeObjectURL(a.href);
}
