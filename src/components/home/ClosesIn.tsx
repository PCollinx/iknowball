"use client";

import { useRouter } from "next/navigation";
import { useCountdown } from "@/components/daily/useCountdown";

const pad = (n: number) => String(n).padStart(2, "0");

/** Time left on today's Daily, ticking, as 05:12:44. At midnight WAT the page reloads for the next one. */
export function ClosesIn({ closesAt, serverNow }: { closesAt: string; serverNow: number }) {
  const router = useRouter();
  const left = useCountdown(closesAt, serverNow, () => router.refresh());
  return (
    <span className="tabular-nums">
      {pad(Math.floor(left / 3600))}:{pad(Math.floor((left % 3600) / 60))}:{pad(left % 60)}
    </span>
  );
}
