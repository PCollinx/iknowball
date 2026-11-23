"use client";

import { useEffect, useRef } from "react";
import { ArrowUpRight } from "@/components/icons/Icon";

// See the card first (Collins, 23 Nov 2026, option A "Peek first" of
// https://claude.ai/artifact/4wPLz68MHYBW3TDVk2B8jS): full time's send button
// opens the card big, the message that rides with it, then Send it (the
// phone's share sheet, straight from that tap) or Save picture. A sheet from
// the foot on phones, a box in the middle from 1024px.

export function CardSheet({
  open,
  src,
  alt,
  message,
  onSend,
  onSave,
  onClose,
}: {
  open: boolean;
  /** The PNG that gets sent, so what they see is what goes. */
  src: string;
  alt: string;
  /** The words (and link) that go with it. */
  message: string;
  onSend: () => void;
  onSave: () => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={dialog}
      aria-label="Your card"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        // A tap on the dimmed page around it closes it.
        if (e.target === e.currentTarget) onClose();
      }}
      className="mx-0 mt-auto mb-0 max-h-dvh w-full max-w-none overflow-y-auto border-t-[3px] border-navy bg-white p-0 text-navy backdrop:bg-navy/60 motion-safe:animate-[card-sheet_0.26s_ease-out] lg:m-auto lg:w-[440px] lg:border-[3px] lg:shadow-[7px_7px_0_var(--color-navy)] lg:motion-safe:animate-[whistle-ask_0.22s_ease-out]"
    >
      <div className="flex items-center justify-between bg-navy px-4 py-2 text-teal-light">
        <span className="label">Your card</span>
        <button type="button" onClick={onClose} className="py-1 text-[13px] font-semibold text-white underline underline-offset-[3px]">
          Not now
        </button>
      </div>
      <div className="flex flex-col gap-3 px-4 pt-3.5 pb-[max(16px,env(safe-area-inset-bottom))]">
        {/* eslint-disable-next-line @next/next/no-img-element -- the card PNG itself, already drawn by the button */}
        <img src={src} alt={alt} width={1080} height={1080} className="mx-auto aspect-square w-full max-w-[min(100%,52dvh)] border-2 border-navy" />
        <p className="border-l-4 border-royal bg-mist px-2.5 py-2 text-[13px] leading-snug">
          <span className="label mb-0.5 block text-[10px] text-slate">Goes with it</span>
          {message}
        </p>
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <button
            type="button"
            autoFocus
            onClick={onSend}
            className="btn-teal btn-press flex items-center justify-between px-3 pt-2.5 pb-2 font-display text-[22px] leading-none uppercase"
          >
            <span>Send it</span>
            <ArrowUpRight className="size-[0.75em]" />
          </button>
          <button type="button" onClick={onSave} className="px-1 py-2 text-[14px] font-semibold underline underline-offset-[3px]">
            Save picture
          </button>
        </div>
      </div>
    </dialog>
  );
}

/** Saves the card to the device: a download on a laptop, Files or Photos on a phone. */
export function saveCard(card: File) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(card);
  a.download = card.name;
  a.click();
  URL.revokeObjectURL(a.href);
}
