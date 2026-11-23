"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { Arrow } from "@/components/icons/Icon";
import { IosSteps } from "@/components/pwa/IosSteps";
import { useInstall } from "@/components/pwa/useInstall";
import { askCopy, doneCopy, whatToAsk, type Ask, type Game } from "@/lib/push/ask";
import { isPhone, ticketDue } from "@/lib/pwa/platform";
import { useWhistle } from "./useWhistle";

// The full-time ask (Collins, 23 Nov 2026, option B "Fourth official"): the
// substitution board puts the home screen on and the browser tab off on a
// phone in the browser; from the home screen or a laptop, the whistle on.
// Rules in src/lib/push/ask.ts. It comes 1.5 s after full time, so the score
// is seen first; Not now keeps it away 14 days in this browser or app. The
// Season ticket and the whistle strip stay underneath (Collins).

const LATER = "ikb_whistle_ask_later";
const DELAY_MS = 1500;

function due(): boolean {
  try {
    const at = Number(window.localStorage.getItem(LATER));
    return ticketDue(at > 0 ? at : null, Date.now());
  } catch {
    return true;
  }
}

function notNow() {
  try {
    window.localStorage.setItem(LATER, String(Date.now()));
  } catch {
    // Storage blocked: it's gone for this page view only.
  }
}

const noChange = () => () => {};

type Phase = { kind: "waiting" } | { kind: "open"; ask: Ask } | { kind: "done"; ask: "install" | "whistle" } | { kind: "closed" };

export function WhistleAsk({ game, score, guest }: { game: Game; score: number; guest: boolean }) {
  const { way, inApp, install } = useInstall();
  const { state, turnOn } = useWhistle();
  const phone = useSyncExternalStore(noChange, () => isPhone(navigator.userAgent, navigator.maxTouchPoints), () => false);
  const [phase, setPhase] = useState<Phase>({ kind: "waiting" });
  const [busy, setBusy] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const decision = whatToAsk({ phone, way, whistle: state.kind });

  // Decided once a page: what it finds first is what it asks, or it asks nothing.
  const settled = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    if (settled.current || phase.kind !== "waiting" || decision === "wait") return;
    settled.current = true;
    if (decision === null || !due()) return;
    timer.current = setTimeout(() => setPhase({ kind: "open", ask: decision }), DELAY_MS);
  }, [phase.kind, decision]);
  useEffect(() => () => clearTimeout(timer.current), []);

  const open = phase.kind === "open" || phase.kind === "done";
  useEffect(() => {
    const d = dialog.current;
    if (open && d && !d.open) d.showModal();
  }, [open]);

  function close() {
    dialog.current?.close();
    setPhase({ kind: "closed" });
  }

  function later() {
    notNow();
    close();
  }

  async function go(ask: Ask) {
    if (ask === "ios") return later();
    setBusy(true);
    try {
      if (ask === "install") {
        if (await install()) setPhase({ kind: "done", ask });
        else later();
      } else {
        // All three buzzes on (Collins), straight from the tap: iPhone only asks from one.
        await turnOn();
        if (Notification.permission === "granted") setPhase({ kind: "done", ask });
        else close();
      }
    } catch {
      close();
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;
  const ask = phase.ask;
  const copy = askCopy(ask, game, score);
  const done = phase.kind === "done" ? doneCopy(phase.ask, game) : null;

  return (
    <dialog
      ref={dialog}
      aria-label={done ? done.title : copy.title}
      onCancel={(e) => {
        e.preventDefault();
        if (done) close();
        else later();
      }}
      className="m-auto w-[min(380px,calc(100%-32px))] max-w-none overflow-visible bg-transparent p-0 text-navy backdrop:bg-navy/60 motion-safe:animate-[whistle-ask_0.22s_ease-out]"
    >
      <div className="border-4 border-navy bg-[#111] px-3 pt-3 pb-2.5 text-white shadow-[6px_6px_0_var(--color-teal-light)]">
        <div className="flex justify-between text-[10px] font-semibold tracking-[0.14em] text-[#8a90a8] uppercase">
          <span>Substitution</span>
          <span>iKnowBall</span>
        </div>
        <div className="mt-2 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-2.5 gap-y-2">
          <Led on>On</Led>
          <span className="font-display text-[26px] leading-none text-[#3dff8a] uppercase [text-shadow:0_0_8px_rgba(61,255,138,0.6)]">{copy.on}</span>
          <Led>Off</Led>
          <span className="font-display text-[26px] leading-none text-[#ff4d5e] uppercase line-through decoration-2 [text-shadow:0_0_8px_rgba(255,77,94,0.6)]">
            {copy.off}
          </span>
        </div>
      </div>
      <div className="flex max-h-[60dvh] flex-col gap-3 overflow-y-auto border-[3px] border-t-0 border-navy bg-white px-3.5 pt-3.5 pb-3">
        <h2 className="font-display text-[32px] leading-[0.92] uppercase">{done ? done.title : copy.title}</h2>
        <p className="text-[15px] leading-snug text-slate">{done ? done.line : copy.line}</p>
        {!done && ask === "ios" && <IosSteps guest={guest} inApp={inApp} />}
        {done ? (
          <button type="button" onClick={close} autoFocus className="btn-white btn-press flex w-full items-center justify-between px-3 pt-2.5 pb-2 font-display text-[22px] leading-none uppercase">
            <span>Back to full time</span>
            <Arrow />
          </button>
        ) : (
          <>
            <button
              type="button"
              disabled={busy}
              autoFocus
              onClick={() => go(ask)}
              className="btn-teal btn-press flex w-full items-center justify-between px-3 pt-2.5 pb-2 font-display text-[22px] leading-none uppercase disabled:opacity-60"
            >
              <span>{copy.button}</span>
              <Arrow />
            </button>
            {ask !== "ios" && (
              <button type="button" onClick={later} className="self-center py-1 text-[13px] font-semibold text-slate underline underline-offset-[3px]">
                Not now
              </button>
            )}
          </>
        )}
      </div>
    </dialog>
  );
}

/** The board's lit tag: green for on, red for off. */
function Led({ on = false, children }: { on?: boolean; children: ReactNode }) {
  return (
    <span
      className={`border-2 px-2 pt-0.5 font-display text-[22px] leading-none uppercase ${
        on ? "border-[#3dff8a] text-[#3dff8a] [text-shadow:0_0_8px_rgba(61,255,138,0.6)]" : "border-[#ff4d5e] text-[#ff4d5e] [text-shadow:0_0_8px_rgba(255,77,94,0.6)]"
      }`}
    >
      {children}
    </span>
  );
}
