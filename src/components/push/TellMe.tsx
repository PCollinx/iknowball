"use client";

import { useState } from "react";
import { WhistleStripFrame, WhistleSwitch } from "./Whistle";
import { useWhistle } from "./useWhistle";

// Option B of the whistle (Collins, 7 Nov 2026): under your own challenge's
// ticket at Clash full time, the moment you most want to know. Turning it on
// here switches on challenges only; the Daily and the league stay off until
// they're chosen on Your shirt. Gone once this device has the whistle (or
// can't have it): Your shirt holds the switches from then on.

export function TellMe() {
  const { state, turnOn } = useWhistle();
  const [busy, setBusy] = useState(false);
  if (state.kind !== "off" && !(state.kind === "on" && busy)) return null;

  return (
    <WhistleStripFrame label="Tell me when they play" title="Tell me when they play" line="A buzz the moment a mate takes on your score.">
      <div className="mt-1.5 flex justify-end">
        <WhistleSwitch
          on={state.kind === "on"}
          label="Tell me when they play"
          onChange={(on) => {
            if (!on || busy) return;
            setBusy(true);
            turnOn({ daily: false, league: false, challenges: true });
          }}
        />
      </div>
    </WhistleStripFrame>
  );
}
