"use client";

import { useSyncExternalStore } from "react";
import { inAppBrowser, installWay, type InstallWay } from "@/lib/pwa/platform";

// The browser's install offer is caught by the early script in the root
// layout (PwaScript), which keeps it on window before React is up: Chrome
// can fire it before the page hydrates. This reads it from there.

type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

declare global {
  interface Window {
    __ikbPrompt?: InstallPrompt | null;
    __ikbInstalled?: boolean;
  }
  interface Navigator {
    standalone?: boolean;
  }
}

const EVENT = "ikb-install";
const STANDALONE = "(display-mode: standalone)";

function subscribe(onChange: () => void) {
  const standalone = window.matchMedia(STANDALONE);
  window.addEventListener(EVENT, onChange);
  standalone.addEventListener("change", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    standalone.removeEventListener("change", onChange);
  };
}

function snapshot(): InstallWay {
  return installWay({
    ua: navigator.userAgent,
    touchPoints: navigator.maxTouchPoints,
    standalone: window.matchMedia(STANDALONE).matches || navigator.standalone === true || window.__ikbInstalled === true,
    prompt: Boolean(window.__ikbPrompt),
  });
}

/** How this browser installs the app, null until the page is up (the server can't tell). */
export function useInstall() {
  const way = useSyncExternalStore<InstallWay | null>(subscribe, snapshot, () => null);
  const inApp = useSyncExternalStore(subscribe, () => inAppBrowser(navigator.userAgent), () => false);
  return { way, inApp, install };
}

/** Opens the browser's own "Install app?" sheet. It can be used once. */
async function install() {
  const offer = window.__ikbPrompt;
  if (!offer) return;
  await offer.prompt();
  await offer.userChoice;
  window.__ikbPrompt = null;
  window.dispatchEvent(new Event(EVENT));
}
