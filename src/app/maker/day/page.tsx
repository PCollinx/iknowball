import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { DayEditor, type EditorPart } from "@/components/maker/DayEditor";
import { getDay, requireAdmin } from "@/lib/maker/data";
import { orderToText, recallToText } from "@/lib/maker/parse";
import { gameDate } from "@/lib/time";

export default function MakerDayPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  return (
    <Suspense fallback={<main className="mx-auto min-h-dvh max-w-[1200px] px-4" aria-busy="true" />}>
      <MakerDay searchParams={searchParams} />
    </Suspense>
  );
}

const BLANK: Record<1 | 2, Omit<EditorPart, "part">> = {
  1: { title: "", prompt: "", time: 120, source: "", answers: "", plays: 0, exists: false },
  2: { title: "In order", prompt: "", time: 60, source: "", answers: "", plays: 0, exists: false },
};

async function MakerDay({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  await connection();
  await requireAdmin();
  const { date } = await searchParams;
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) redirect("/maker");

  const day = await getDay(date);
  const parts = ([1, 2] as const).map((n): EditorPart => {
    const p = day.parts.find((x) => x.part === n);
    if (!p) return { part: n, ...BLANK[n] };
    return {
      part: n,
      title: p.title,
      prompt: p.prompt,
      time: p.time_limit_seconds,
      source: p.source_note ?? "",
      answers: n === 1 ? recallToText(p.answers) : orderToText(p.answers),
      plays: p.plays,
      exists: true,
    };
  });
  const status = day.parts.length && day.parts.every((p) => p.status === "scheduled") ? "scheduled" : "draft";

  // Keyed by date so opening another day starts a fresh form.
  return <DayEditor key={date} date={date} today={gameDate()} status={status} parts={parts} />;
}
