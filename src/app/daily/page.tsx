import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { FreeRecall } from "@/components/daily/FreeRecall";
import { FullTime } from "@/components/daily/FullTime";
import { InOrder } from "@/components/daily/InOrder";
import { PickRound } from "@/components/daily/PickRound";
import { KickOff } from "@/components/daily/KickOff";
import { Masthead, shortDate } from "@/components/daily/Masthead";
import { currentUserId, getDailyView } from "@/lib/daily/data";
import { clubInTitle, kitOf } from "@/lib/profile/club";
import { clubChoices, getRating, getSupporter, kitForFixture } from "@/lib/profile/data";
import { publicEnv } from "@/lib/env";
import { isTestSite } from "@/lib/daily/sample";
import { gameDate } from "@/lib/time";
import { KeepyUppy } from "@/components/loading/KeepyUppy";

export const metadata: Metadata = {
  title: "The Daily · iKnowBall",
  description: "One Daily, one try. Prove you know ball.",
};

export default function DailyPage() {
  return (
    <Suspense fallback={<Loading />}>
      <DailyScreen />
    </Suspense>
  );
}

// Reads the session and the clock, so it renders per request.
async function DailyScreen() {
  await connection();
  const [view, userId] = await Promise.all([getDailyView(), currentUserId()]);
  const dateLabel = shortDate(gameDate());
  const [supporter, kit] = await Promise.all([
    userId && (view.kind === "kickoff" || view.kind === "fulltime") ? getSupporter(userId) : null,
    kitForFixture(fixtureTitle(view)),
  ]);

  switch (view.kind) {
    case "none":
      return (
        <main className="mx-auto min-h-dvh max-w-[560px] px-4">
          <Masthead issue={0} right={dateLabel} />
          <h1 className="mt-6 font-display text-[64px] leading-[0.9] uppercase">
            No Daily <span className="text-royal">today</span>
          </h1>
          <p className="mt-3 text-lg">The pitch is being cut. Check back tomorrow.</p>
        </main>
      );
    case "kickoff":
      return (
        <KickOff
          issue={view.issue}
          dateLabel={dateLabel}
          daily={view.daily}
          total={view.total}
          before={view.before}
          club={supporter?.club ?? null}
          kit={kit}
        />
      );
    case "recall":
      return (
        <FreeRecall
          key={view.attemptId}
          issue={view.issue}
          dateLabel={dateLabel}
          partLabel={`Part ${view.daily.part}`}
          title={view.daily.title}
          prompt={view.daily.prompt}
          answerCount={view.daily.answer_count}
          attemptId={view.attemptId}
          deadlineAt={view.deadlineAt}
          serverNow={view.serverNow}
          found={view.found}
          kit={kit}
        />
      );
    case "pick":
      return (
        <PickRound
          key={view.attemptId}
          issue={view.issue}
          dateLabel={dateLabel}
          partLabel={`Part ${view.daily.part}`}
          format={view.daily.format === "era" ? "era" : "pick"}
          title={view.daily.title}
          prompt={view.daily.prompt}
          attemptId={view.attemptId}
          deadlineAt={view.deadlineAt}
          serverNow={view.serverNow}
          questions={view.questions}
          answered={view.answered}
          kit={kit}
        />
      );
    case "order":
      return (
        <InOrder
          key={view.attemptId}
          issue={view.issue}
          dateLabel={dateLabel}
          partLabel={`Part ${view.daily.part}`}
          prompt={view.daily.prompt}
          attemptId={view.attemptId}
          deadlineAt={view.deadlineAt}
          serverNow={view.serverNow}
          items={view.items}
        />
      );
    case "fulltime": {
      // "Who do you support?" is asked once, right after a first Daily.
      const [choices, rating] = await Promise.all([
        supporter && !supporter.asked ? clubChoices() : null,
        userId ? getRating(userId) : null,
      ]);
      const title = view.recall?.daily.title ?? "";
      return (
        <FullTime
          issue={view.issue}
          playDate={view.playDate}
          recall={view.recall}
          order={view.order}
          points={view.points}
          topPercent={view.topPercent}
          position={view.position}
          players={view.players}
          siteUrl={publicEnv().NEXT_PUBLIC_SITE_URL}
          clubChoices={choices}
          kit={kit}
          myKit={kitOf(supporter?.club ?? null)}
          rating={rating}
          fanOf={clubInTitle(supporter?.club ?? null, title) ? supporter!.club!.name : null}
          testSite={isTestSite()}
        />
      );
    }
  }
}

/** The fixture the day is themed on ("Chelsea v Arsenal"), from Part 1. */
function fixtureTitle(view: Awaited<ReturnType<typeof getDailyView>>): string | null {
  switch (view.kind) {
    case "kickoff":
      return view.before?.daily.title ?? (view.daily.part === 1 ? view.daily.title : null);
    case "recall":
      return view.daily.title;
    case "pick":
      return view.daily.part === 1 ? view.daily.title : null;
    case "fulltime":
      return view.recall?.daily.title ?? null;
    default:
      return null;
  }
}

function Loading() {
  return (
    <main className="mx-auto min-h-dvh max-w-[560px] px-4" aria-busy="true">
      <div className="flex justify-between border-b border-navy pt-3.5 pb-2">
        <span className="label">The Daily</span>
      </div>
      <KeepyUppy label="The Daily" caption="Warming up…" />
    </main>
  );
}
