"use client";

import { useEffect, useState } from "react";

/** Live countdown to the moment today's Daily closes (midnight WAT). */
export function NextDaily({ closesAt, className = "text-[32px] text-teal" }: { closesAt: string; className?: string }) {
  const end = Date.parse(closesAt);
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setLeft(Math.max(0, Math.floor((end - Date.now()) / 1000)));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [end]);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    <span className={`font-display tabular-nums ${className}`}>
      {left === null ? "--:--:--" : `${pad(Math.floor(left / 3600))}:${pad(Math.floor(left / 60) % 60)}:${pad(left % 60)}`}
    </span>
  );
}
