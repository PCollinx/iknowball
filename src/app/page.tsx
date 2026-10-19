import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { gameDate, gameDateClosesAt } from "@/lib/time";

// Reads the clock, so it renders per request; the rest of the page is static.
async function DailyCloses() {
  await connection();
  const today = gameDate();
  const closes = gameDateClosesAt(today);
  return (
    <p className="text-sm opacity-70">
      Today&apos;s Daily ({today}) closes at {closes.toISOString().slice(11, 16)} UTC, midnight GMT+1.
    </p>
  );
}

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 px-4">
      <h1 className="font-display text-5xl uppercase text-royal">iKnowBall</h1>
      <p>One Daily, one try. Then settle it in a Clash and your league.</p>
      <Link href="/daily" className="bg-royal p-3.5 text-center font-display text-[28px] text-white uppercase">
        Play today&apos;s Daily
      </Link>
      <Link href="/clash" className="group flex items-center gap-3 border-y-[3px] border-double border-navy py-2.5">
        <span className="min-w-0 flex-1">
          <span className="block font-display text-[32px] leading-[0.9] uppercase">
            Clash <span className="text-royal">sprint</span>
          </span>
          <span className="block text-sm text-navy/70">Sixty seconds of Higher or Lower. Send the link and settle it.</span>
        </span>
        <span aria-hidden="true" className="font-display text-[32px] text-royal transition-transform duration-150 group-hover:translate-x-1">
          →
        </span>
      </Link>
      <Link href="/league" className="group flex items-center gap-3 border-b-[3px] border-double border-navy pb-2.5">
        <span className="min-w-0 flex-1">
          <span className="block font-display text-[32px] leading-[0.9] uppercase">
            The <span className="text-royal">League</span>
          </span>
          <span className="block text-sm text-navy/70">Mini-leagues with your mates. Best 5 Dailies a week count.</span>
        </span>
        <span aria-hidden="true" className="font-display text-[32px] text-royal transition-transform duration-150 group-hover:translate-x-1">
          →
        </span>
      </Link>
      <Link href="/profile" className="border-2 border-navy p-3 text-center font-display text-2xl uppercase">
        Your shirt
      </Link>
      <Suspense fallback={<p className="text-sm opacity-70">&nbsp;</p>}>
        <DailyCloses />
      </Suspense>
    </main>
  );
}
