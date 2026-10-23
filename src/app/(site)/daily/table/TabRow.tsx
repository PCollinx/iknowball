"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** The tabs in one sideways-scrolling row, with the open tab scrolled into view. */
export function TabRow({ children }: { children: ReactNode }) {
  const row = useRef<HTMLElement>(null);
  useEffect(() => {
    const on = row.current?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!on || !row.current) return;
    row.current.scrollLeft = on.offsetLeft - row.current.offsetLeft - 16;
  });
  return (
    <nav ref={row} aria-label="Tables" className="mt-3 flex snap-x gap-1.5 overflow-x-auto overscroll-x-contain pb-1 lg:mt-3.5">
      {children}
    </nav>
  );
}
