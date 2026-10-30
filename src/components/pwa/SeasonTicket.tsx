"use client";

import { useState, useSyncExternalStore } from "react";
import { ticketDue } from "@/lib/pwa/platform";
import { IosSteps } from "./IosSteps";
import { useInstall } from "./useInstall";

// "Season ticket" (step 16, option A, Collins, 30 Oct 2026): at the Daily's
// full time, a ticket to put iKnowBall on the home screen, the app icon on
// the teal stub. One tap where the browser offers its own install (Android,
// desktop Chrome and Edge); the Share steps on iPhone. "Not now" keeps it
// away for 14 days (this browser only). Mocks:
// https://claude.ai/artifact/CQFt8CLgLZEpMYkf9ZV6uE

const LATER = "ikb_install_later";
const CHANGED = "ikb-install-later";

function readLater(): number | null {
  try {
    const at = Number(window.localStorage.getItem(LATER));
    return at > 0 ? at : null;
  } catch {
    return null;
  }
}

function subscribeLater(onChange: () => void) {
  window.addEventListener(CHANGED, onChange);
  return () => window.removeEventListener(CHANGED, onChange);
}

function notNow() {
  try {
    window.localStorage.setItem(LATER, String(Date.now()));
  } catch {
    // Storage blocked: it hides for this page view only.
  }
  window.dispatchEvent(new Event(CHANGED));
}

type Props = {
  guest: boolean;
  /** The app icon's data URI (src/lib/og/logo.tsx is server-only: it uses Buffer). */
  icon: string;
  /** "2026/27". */
  season: string;
};

export function SeasonTicket({ guest, icon, season }: Props) {
  const { way, inApp, install } = useInstall();
  const due = useSyncExternalStore(subscribeLater, () => ticketDue(readLater(), Date.now()), () => false);
  const [hidden, setHidden] = useState(false);
  if (hidden || !due || (way !== "prompt" && way !== "ios")) return null;

  const phone = way === "ios" || /Android|Mobile/.test(navigator.userAgent);
  return (
    <section aria-label="Season ticket" className="mt-6 flex -rotate-1 border-[3px] border-navy bg-white shadow-[6px_6px_0_var(--color-navy)] lg:max-w-[520px] lg:shadow-[7px_7px_0_var(--color-navy)]">
      <div className="flex min-w-0 flex-1 flex-col gap-2 px-3 pt-3 pb-3.5 lg:px-4">
        <span className="label text-teal">Season ticket · Admit one</span>
        <h2 className="font-display text-[36px] leading-[0.9] uppercase lg:text-[38px]">{phone ? "Keep it on your phone" : "Pin it to your desktop"}</h2>
        {way === "ios" ? (
          <>
            <p className="text-[15px] leading-snug">iPhone does it from Safari, in three taps:</p>
            <IosSteps guest={guest} inApp={inApp} />
          </>
        ) : (
          <>
            <p className="text-[15px] leading-snug">
              {phone ? "One tap from your home screen to the Daily. Full screen, no browser bars." : "Its own window and a Dock or taskbar icon, straight to the Daily."}
            </p>
            <button
              type="button"
              onClick={() => install()}
              className="btn-teal btn-press mt-1 flex items-center justify-between gap-6 px-3.5 py-2.5 font-display text-2xl uppercase"
            >
              <span>{phone ? "Add to home screen" : "Install iKnowBall"}</span>
              <span aria-hidden="true">→</span>
            </button>
          </>
        )}
        <button
          type="button"
          onClick={() => {
            notNow();
            setHidden(true);
          }}
          className="self-start py-1 text-sm font-semibold text-slate underline underline-offset-[3px]"
        >
          {way === "ios" ? "Got it" : "Not now"}
        </button>
      </div>
      <div className="flex w-[84px] shrink-0 flex-col items-center justify-center gap-2.5 border-l-[3px] border-dashed border-navy bg-teal-light py-2.5 lg:w-24">
        {/* eslint-disable-next-line @next/next/no-img-element -- a small inline data URI, nothing for next/image to optimise */}
        <img src={icon} alt="" className="h-14 w-14 rounded-xl border-2 border-navy" />
        <span className="rotate-180 font-display text-lg uppercase [writing-mode:vertical-rl]">Season {season.slice(2)}</span>
      </div>
    </section>
  );
}
