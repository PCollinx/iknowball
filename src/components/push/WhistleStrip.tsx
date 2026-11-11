"use client";

import { useState, useSyncExternalStore } from "react";
import { IosSteps } from "@/components/pwa/IosSteps";
import { useInstall } from "@/components/pwa/useInstall";
import { ticketDue } from "@/lib/pwa/platform";
import { StripButton, WhistleStripFrame } from "./Whistle";
import { useWhistle } from "./useWhistle";

// Option A of the whistle (Collins, 7 Nov 2026): a small strip at the Daily's
// full time (home had it in the installed app until 11 Nov 2026). "Not now"
// keeps it away for 14 days in this browser, like the Season ticket. On
// iPhone in Safari it carries the home screen steps instead (the Season
// ticket stands down there, so full time asks once).

const LATER = "ikb_whistle_later";
const CHANGED = "ikb-whistle-later";

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

export function WhistleStrip({ guest, className = "" }: { guest: boolean; className?: string }) {
  const { state, turnOn } = useWhistle();
  const { inApp } = useInstall();
  const due = useSyncExternalStore(subscribeLater, () => ticketDue(readLater(), Date.now()), () => false);
  const [busy, setBusy] = useState(false);
  if (!due || (state.kind !== "off" && state.kind !== "install")) return null;

  const dismiss = (
    <button type="button" onClick={notNow} className="py-1 text-[13px] font-semibold text-slate underline underline-offset-[3px]">
      {state.kind === "install" ? "Got it" : "Not now"}
    </button>
  );

  return (
    <div className={className}>
      {state.kind === "install" ? (
        <WhistleStripFrame label="The whistle" title="Don't miss kick-off" line="iPhone only buzzes for apps on your home screen. Put iKnowBall there first:">
          <div className="mt-2">
            <IosSteps guest={guest} inApp={inApp} />
          </div>
          <p className="mt-2 text-[13px] leading-snug">Then open it from there and turn on the whistle.</p>
          {dismiss}
        </WhistleStripFrame>
      ) : (
        <WhistleStripFrame label="The whistle" title="Don't miss kick-off" line="A buzz when tomorrow's Daily is up, and when a mate beats your challenge.">
          <div className="mt-1.5 flex items-center gap-3.5">
            <StripButton
              disabled={busy}
              onClick={() => {
                setBusy(true);
                turnOn().finally(() => setBusy(false));
              }}
            >
              Turn on
            </StripButton>
            {dismiss}
          </div>
        </WhistleStripFrame>
      )}
    </div>
  );
}
