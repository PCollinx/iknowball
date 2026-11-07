"use client";

import { useState } from "react";
import { Section } from "@/components/profile/Peg";
import { IosSteps } from "@/components/pwa/IosSteps";
import { useInstall } from "@/components/pwa/useInstall";
import type { Pref } from "@/lib/push/send";
import { WhistleSwitch } from "./Whistle";
import { useWhistle } from "./useWhistle";

// Option C of the whistle (Collins, 7 Nov 2026): the switches on Your shirt.
// The Daily sends both its buzzes (09:00 when it's up, 20:00 if you haven't
// played), with no time to pick. The switches are this device's.

const ROWS: { pref: Pref; title: string; line: string }[] = [
  { pref: "daily", title: "The Daily", line: "When it's up at 9:00, and at 20:00 if you haven't played" },
  { pref: "challenges", title: "Challenges", line: "When a mate takes on your score" },
  { pref: "league", title: "Your league", line: "Monday: how last week finished" },
];

export function WhistleSection({ guest }: { guest: boolean }) {
  const { state, turnOn, flip, test } = useWhistle();
  const { inApp } = useInstall();
  const [busy, setBusy] = useState(false);
  const [tested, setTested] = useState<"sent" | "failed" | null>(null);
  if (state.kind === "loading" || state.kind === "unsupported") return null;

  return (
    <Section title="The whistle">
      {state.kind === "install" && (
        <>
          <p className="leading-snug">iPhone only blows the whistle for apps on your home screen. Add iKnowBall there, open it, and turn it on here.</p>
          <div className="mt-3">
            <IosSteps guest={guest} inApp={inApp} />
          </div>
        </>
      )}
      {state.kind === "blocked" && (
        <>
          <p className="leading-snug">Notifications are blocked for iKnowBall in this browser. Turn them back on in its site settings, then come back here.</p>
          <span className="mt-3 inline-block -rotate-2 border-[3px] border-navy bg-white px-2.5 pt-1 pb-0.5 font-display text-xl text-red-card uppercase shadow-[3px_3px_0_var(--color-navy)]">
            Whistle blocked
          </span>
        </>
      )}
      {state.kind === "off" && (
        <>
          <p className="leading-snug">A buzz when the Daily&apos;s on, when a mate takes on your challenge, and how your league finished.</p>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setBusy(true);
              turnOn().finally(() => setBusy(false));
            }}
            className="btn-teal btn-press mt-3 flex w-full items-center justify-between px-3.5 py-2.5 font-display text-2xl uppercase disabled:opacity-60"
          >
            <span>Turn on the whistle</span>
            <span aria-hidden="true">→</span>
          </button>
        </>
      )}
      {state.kind === "on" && (
        <>
          <ul>
            {ROWS.map((r) => (
              <li key={r.pref} className="flex items-center justify-between gap-3 border-b border-track py-2.5 last:border-b-0">
                <span className="min-w-0">
                  <span className="block font-display text-xl leading-none uppercase">{r.title}</span>
                  <span className="mt-1 block text-[13px] leading-snug text-slate">{r.line}</span>
                </span>
                <WhistleSwitch on={state.prefs[r.pref]} label={r.title} onChange={(on) => flip(r.pref, on)} />
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[13px] text-slate">
            On for this device only.{" "}
            <button type="button" onClick={() => test().then(setTested)} className="font-semibold underline underline-offset-[3px]">
              Send me a test
            </button>
            {tested === "sent" && <span className="ml-1.5 font-semibold text-teal">Sent.</span>}
            {tested === "failed" && <span className="ml-1.5 font-semibold text-red-card">It didn&apos;t send. Try turning it off and on.</span>}
          </p>
        </>
      )}
    </Section>
  );
}
