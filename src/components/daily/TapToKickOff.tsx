"use client";

/** The kick-off's Daily sticker kicks off too (Collins, 9 Nov 2026): a tap
 * anywhere on it submits the Kick off form, so the button stays the one
 * control for keyboards and screen readers. */
export function TapToKickOff({ form, children }: { form: string; children: React.ReactNode }) {
  return (
    <div
      onClick={() => (document.getElementById(form) as HTMLFormElement | null)?.requestSubmit()}
      // Pressed, the sticker pushes into its shadow like the sticker buttons (btn-press).
      className="cursor-pointer active:[&_[data-sticker]]:translate-x-[3px]! active:[&_[data-sticker]]:translate-y-[3px]! active:[&_[data-sticker]]:rotate-0! active:[&_[data-sticker]]:shadow-[2px_2px_0_var(--color-navy)]!"
    >
      {children}
    </div>
  );
}
