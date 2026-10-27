"use client";

export default function DailyError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto w-full flex-1 max-w-[560px] px-4 pt-6">
      <span className="label text-red-card">Stoppage</span>
      <h1 className="mt-1 font-display text-[56px] leading-[0.9] uppercase">Something went off</h1>
      <p className="mt-3 text-lg">{error.message || "The Daily didn't load."} Your attempt is safe on our side.</p>
      <button type="button" onClick={reset} className="btn-teal btn-press mt-5 flex w-full items-center justify-between px-[18px] py-3.5 font-display text-[28px] uppercase">
        <span>Try again</span>
        <span aria-hidden="true">→</span>
      </button>
    </main>
  );
}
