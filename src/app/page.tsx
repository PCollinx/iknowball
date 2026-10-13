import { gameDate, gameDateClosesAt } from "@/lib/time";

export const dynamic = "force-dynamic";

export default function Home() {
  const today = gameDate();
  const closes = gameDateClosesAt(today);
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 px-4">
      <h1 className="text-4xl font-bold">iKnowBall</h1>
      <p>One Daily, one try. Coming soon.</p>
      <p className="text-sm opacity-70">
        Today&apos;s Daily ({today}) closes at {closes.toISOString().slice(11, 16)} UTC, midnight GMT+1.
      </p>
    </main>
  );
}
