"use client";

import { useCallback, useEffect, useState } from "react";
import { saveWhistle, setWhistle, whistleFor, type Prefs } from "@/lib/push/actions";
import type { Pref } from "@/lib/push/send";
import { isIos } from "@/lib/pwa/platform";

// The whistle in the browser (Collins, 7 Nov 2026): whether this device can
// get push notifications, has them on, and the switches. iPhone only offers
// them to the app on the home screen, so in Safari the answer is "install".

export type WhistleState =
  | { kind: "loading" }
  /** No push here (an old browser, or the keys aren't set on this site). */
  | { kind: "unsupported" }
  /** iPhone or iPad in the browser: add it to the home screen first. */
  | { kind: "install" }
  /** The player said no to the browser's own question; only its settings can undo it. */
  | { kind: "blocked" }
  | { kind: "off" }
  | { kind: "on"; endpoint: string; prefs: Prefs };

const KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function standalone() {
  return window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
}

/** The VAPID key as the bytes pushManager.subscribe wants. */
function keyBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const base64 = (base64url + "=".repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

async function look(): Promise<WhistleState> {
  if (!KEY) return { kind: "unsupported" };
  if (isIos(navigator.userAgent, navigator.maxTouchPoints) && !standalone()) return { kind: "install" };
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return { kind: "unsupported" };
  if (Notification.permission === "denied") return { kind: "blocked" };
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (!sub || Notification.permission !== "granted") return { kind: "off" };
  const prefs = await whistleFor(sub.endpoint);
  return prefs ? { kind: "on", endpoint: sub.endpoint, prefs } : { kind: "off" };
}

export function useWhistle() {
  const [state, setState] = useState<WhistleState>({ kind: "loading" });

  useEffect(() => {
    let live = true;
    look()
      .catch((): WhistleState => ({ kind: "unsupported" }))
      .then((s) => live && setState(s));
    return () => {
      live = false;
    };
  }, []);

  /** Asks the browser, then saves this device. Call it straight from a tap: iPhone only asks from one. */
  const turnOn = useCallback(async (prefs?: Partial<Prefs>) => {
    if (!KEY) return;
    const answer = await Notification.requestPermission();
    if (answer !== "granted") {
      setState({ kind: answer === "denied" ? "blocked" : "off" });
      return;
    }
    // Production registers the worker on load; dev doesn't, so this makes sure.
    await navigator.serviceWorker.register("/sw.js");
    const reg = await navigator.serviceWorker.ready;
    const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(KEY) }));
    const saved = await saveWhistle(sub.toJSON(), prefs);
    setState(saved ? { kind: "on", endpoint: sub.endpoint, prefs: saved } : { kind: "off" });
  }, []);

  const flip = useCallback(
    async (which: Pref, on: boolean) => {
      if (state.kind !== "on") return;
      setState({ ...state, prefs: { ...state.prefs, [which]: on } });
      const saved = await setWhistle(state.endpoint, which, on);
      if (saved) setState({ ...state, prefs: saved });
    },
    [state],
  );

  return { state, turnOn, flip };
}
