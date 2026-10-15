"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";

/**
 * Seconds left until a server deadline. The server's clock decides; this only
 * corrects for the gap between the phone's clock and the server's at render.
 */
export function useCountdown(deadlineAt: string, serverNow: number, onZero: () => void) {
  const [offset] = useState(() => serverNow - Date.now());
  const deadline = Date.parse(deadlineAt);
  const [left, setLeft] = useState(() => Math.max(0, Math.ceil((deadline - (Date.now() + offset)) / 1000)));
  const fired = useRef(false);
  const reachedZero = useEffectEvent(onZero);

  useEffect(() => {
    const tick = () => {
      const s = Math.max(0, Math.ceil((deadline - (Date.now() + offset)) / 1000));
      setLeft(s);
      if (s === 0 && !fired.current) {
        fired.current = true;
        reachedZero();
      }
    };
    tick();
    const t = setInterval(tick, 250);
    return () => clearInterval(t);
  }, [deadline, offset]);

  return left;
}
