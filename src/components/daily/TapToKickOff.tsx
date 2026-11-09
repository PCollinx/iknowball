"use client";

/** The kick-off's Daily sticker kicks off too (Collins, 9 Nov 2026): a tap
 * anywhere on it submits the Kick off form, so the button stays the one
 * control for keyboards and screen readers. */
export function TapToKickOff({ form, children }: { form: string; children: React.ReactNode }) {
  return (
    <div
      onClick={() => (document.getElementById(form) as HTMLFormElement | null)?.requestSubmit()}
      className="cursor-pointer transition-transform duration-150 hover:-translate-y-1 active:translate-y-0"
    >
      {children}
    </div>
  );
}
