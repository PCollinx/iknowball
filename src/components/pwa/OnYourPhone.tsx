"use client";

import { Section } from "@/components/profile/Peg";
import { IosSteps } from "./IosSteps";
import { useInstall } from "./useInstall";

// "On your phone" on Your shirt (step 16, option C, Collins, 30 Oct 2026):
// always there, so whoever said "Not now" to the full-time ticket can still
// add the app. The icon hangs on a peg like your shirt. Hidden once it's
// installed (Collins, 31 Oct 2026) and where the browser can't install.

const PEG = "flex h-[100px] w-[92px] shrink-0 items-center justify-center border-t-[5px] border-navy bg-mist";

export function OnYourPhone({ guest, icon }: { guest: boolean; icon: string }) {
  const { way, inApp, install } = useInstall();
  if (way !== "prompt" && way !== "ios") return null;

  const phone = way === "ios" || /Android|Mobile/.test(navigator.userAgent);
  const title = phone ? "On your phone" : "On your desktop";
  return (
    <Section title={title}>
      <div className="flex items-center gap-3.5">
        <div className={PEG}>
          {/* eslint-disable-next-line @next/next/no-img-element -- a small inline data URI, nothing for next/image to optimise */}
          <img src={icon} alt="The iKnowBall app icon" className="h-16 w-16 -rotate-[4deg] rounded-[14px] border-2 border-navy" />
        </div>
        <p className="leading-snug">
          {phone ? "Not on your home screen yet. Add it and the Daily opens full screen, in one tap." : "Install it and iKnowBall gets its own window and icon."}
        </p>
      </div>
      {way === "ios" ? (
        <div className="mt-3">
          <IosSteps guest={guest} inApp={inApp} />
        </div>
      ) : (
        <button type="button" onClick={() => install()} className="btn-white btn-press mt-3 flex w-full items-center justify-between px-3.5 py-2.5 font-display text-2xl uppercase">
          <span>{phone ? "Add to home screen" : "Install iKnowBall"}</span>
          <span aria-hidden="true">→</span>
        </button>
      )}
    </Section>
  );
}
