import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { DayEditor, type EditorPart } from "@/components/maker/DayEditor";
import { MakerBar } from "@/components/maker/MakerBar";
import { getDay, requireAdmin, type MakerAnswer } from "@/lib/maker/data";
import type { DailyFormat } from "@/lib/daily/score";
import { orderToText, picksToText, recallToText } from "@/lib/maker/parse";
import { ORDER_SECONDS } from "@/lib/drafts/generate";
import { gameDate } from "@/lib/time";

export default function MakerDayPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  return (
    <Suspense fallback={<main className="min-h-dvh" aria-busy="true" />}>
      <MakerDay searchParams={searchParams} />
    </Suspense>
  );
}

const BLANK: Record<1 | 2, Omit<EditorPart, "part">> = {
  1: { format: "free_recall", title: "", prompt: "", time: 120, source: "", answers: "", plays: 0, exists: false, template: null },
  2: { format: "in_order", title: "In order", prompt: "", time: ORDER_SECONDS, source: "", answers: "", plays: 0, exists: false, template: null },
};

function answersText(format: DailyFormat, answers: MakerAnswer[]): string {
  if (format === "pick" || format === "era") return picksToText(answers);
  return format === "free_recall" ? recallToText(answers) : orderToText(answers);
}

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
      format: p.format,
      title: p.title,
      prompt: p.prompt,
      time: p.time_limit_seconds,
      source: p.source_note ?? "",
      answers: answersText(p.format, p.answers),
      plays: p.plays,
      exists: true,
      template: p.template,
    };
  });
  const status = day.parts.length && day.parts.every((p) => p.status === "scheduled") ? "scheduled" : "draft";

  // Keyed by date so opening another day starts a fresh form.
  return (
    <>
      <MakerBar active="days" />
      <DayEditor key={date} date={date} today={gameDate()} status={status} parts={parts} />
    </>
  );
}
