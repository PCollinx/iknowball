"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";

/** What the server says when a round's clock starts. */
export type ClockStart = { deadlineAt: string; serverNow: number };

type Options = {
  /** The server's deadline as the page rendered it. */
  deadlineAt: string;
  serverNow: number;
  /** Whether the clock had already started when the page rendered. */
  begun: boolean;
  /** The round's full time, shown until the clock starts. */
  limitSeconds: number;
  /** Starts the clock on the server, once the round is on screen. */
  begin: () => Promise<ClockStart | null>;
  onZero: () => void;
};

/**
 * Seconds left in a round. The clock starts on the server when the round is
 * on screen (not when Kick off was tapped, which lost seconds to the page
 * load), and the server's clock decides; this only corrects for the gap
 * between the phone's clock and the server's.
 */
export function useRoundClock({ deadlineAt, serverNow, begun, limitSeconds, begin, onZero }: Options) {
  const [clock, setClock] = useState(() => (begun ? { deadline: Date.parse(deadlineAt), offset: serverNow - Date.now() } : null));
  const [left, setLeft] = useState(() => (clock ? Math.max(0, Math.ceil((clock.deadline - (Date.now() + clock.offset)) / 1000)) : limitSeconds));
  const fired = useRef(false);
  const reachedZero = useEffectEvent(onZero);
  const start = useEffectEvent(begin);

  // Starts the clock once, on first show.
  useEffect(() => {
    if (begun) return;
    let live = true;
    const fallback = () => ({ deadline: Date.parse(deadlineAt), offset: serverNow - Date.now() });
    start()
      .then((r) => live && setClock(r ? { deadline: Date.parse(r.deadlineAt), offset: r.serverNow - Date.now() } : fallback()))
      // Offline or refused: run to the deadline Kick off set, which the server enforces anyway.
      .catch(() => live && setClock(fallback()));
    return () => {
      live = false;
    };
  }, [begun, deadlineAt, serverNow]);

  useEffect(() => {
    if (!clock) return;
    const tick = () => {
      const s = Math.max(0, Math.ceil((clock.deadline - (Date.now() + clock.offset)) / 1000));
      setLeft(s);
      if (s === 0 && !fired.current) {
        fired.current = true;
        reachedZero();
      }
    };
    tick();
    const t = setInterval(tick, 250);
    return () => clearInterval(t);
  }, [clock]);

  /** A new deadline from the server (Clash moves it for a wrong call). */
  const moveDeadline = (at: string) => setClock((c) => (c ? { ...c, deadline: Date.parse(at) } : c));
  return { left, started: clock !== null, moveDeadline };
}
