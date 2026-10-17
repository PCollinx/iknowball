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
      <p>One Daily, one try.</p>
      <Link href="/daily" className="bg-royal p-3.5 text-center font-display text-[28px] text-white uppercase">
        Play today&apos;s Daily
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
