"use client";

import { useEffect } from "react";

/** The page you were after: the service worker's ?from=, kept to this site. */
function wanted(): string {
  const from = new URLSearchParams(window.location.search).get("from") ?? "/";
  return from.startsWith("/") && !from.startsWith("//") && !from.startsWith("/offline") ? from : "/";
}

/** Try again, and the same by itself the moment the connection is back. */
export function BackOnline() {
  useEffect(() => {
    const back = () => window.location.assign(wanted());
    window.addEventListener("online", back);
    return () => window.removeEventListener("online", back);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => window.location.assign(wanted())}
        className="btn-teal btn-press mt-[18px] flex w-full items-center justify-between px-[18px] py-3.5 font-display text-[28px] uppercase lg:max-w-[420px]"
      >
        <span>Try again</span>
        <span aria-hidden="true">→</span>
      </button>
      <p className="label mt-3.5 text-slate">We&apos;ll reload by ourselves when you&apos;re back</p>
    </>
  );
}
