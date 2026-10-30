import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { FreeRecall } from "@/components/daily/FreeRecall";
import { FullTime } from "@/components/daily/FullTime";
import { InOrder } from "@/components/daily/InOrder";
import { PickRound } from "@/components/daily/PickRound";
import { KickOff } from "@/components/daily/KickOff";
import { Masthead, shortDate } from "@/components/daily/Masthead";
import { currentIsGuest, currentUserId, getDailyView } from "@/lib/daily/data";
import { clubInTitle, kitOf, type Club } from "@/lib/profile/club";
import { clubChoices, getRating, getSupporter, kitForFixture, kitsForFixture, pathClubs } from "@/lib/profile/data";
import { pathOf } from "@/components/daily/KitTrail";
import { publicEnv } from "@/lib/env";
import { isTestSite } from "@/lib/daily/sample";
import { gameDate, gameDateClosesAt } from "@/lib/time";
import { KeepyUppy } from "@/components/loading/KeepyUppy";
import { MatchLive } from "@/components/nav/MatchLive";

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

/** When today's Daily closes, and the server's clock, for the sticker's countdown. */
function readClock() {
  return { closesAt: gameDateClosesAt(gameDate()).toISOString(), serverNow: Date.now() };
}

// Reads the session and the clock, so it renders per request.
async function DailyScreen() {
  await connection();
  const [view, userId] = await Promise.all([getDailyView(), currentUserId()]);
  const dateLabel = shortDate(gameDate());
  const [supporter, kit, kits, pathKits] = await Promise.all([
    userId && (view.kind === "kickoff" || view.kind === "fulltime") ? getSupporter(userId) : null,
    kitForFixture(fixtureTitle(view)),
    view.kind === "kickoff" && !view.before ? kitsForFixture(view.daily.title) : ([undefined, undefined] as const),
    pathClubs(careerClubNames(view)),
  ]);

  switch (view.kind) {
    case "none":
      return (
        <main className="mx-auto w-full max-w-[560px] flex-1 px-4 pb-10">
          <Masthead issue={0} right={dateLabel} />
          <h1 className="mt-6 font-display text-[64px] leading-[0.9] uppercase">
            No Daily <span className="text-royal">today</span>
          </h1>
          <p className="mt-3 text-lg">The pitch is being cut. Back tomorrow with a new one.</p>
          <Link
            href="/clash"
            className="btn-teal btn-press mt-6 flex items-center justify-between px-[18px] py-3.5 font-display text-[26px] uppercase"
          >
            <span>Kick off a Clash instead</span>
            <span aria-hidden="true">→</span>
          </Link>
        </main>
      );
    case "kickoff":
      return (
        <KickOff
          issue={view.issue}
          dateLabel={dateLabel}
          daily={view.daily}
          parts={view.parts}
          total={view.total}
          before={view.before}
          club={supporter?.club ?? null}
          kit={kit}
          kits={[kits[0], kits[1]]}
          {...readClock()}
        />
      );
    case "recall":
      return (
        <>
          <MatchLive />
          <FreeRecall
            key={view.attemptId}
            whistle={view.daily.part === 1 ? "half" : "full"}
            partLabel={`Part ${view.daily.part}`}
            title={view.daily.title}
            prompt={view.daily.prompt}
            answerCount={view.daily.answer_count}
            attemptId={view.attemptId}
            dailyId={view.daily.id}
            begun={view.begun}
            limitSeconds={view.daily.time_limit_seconds}
            deadlineAt={view.deadlineAt}
            serverNow={view.serverNow}
            found={view.found}
            kit={kit}
          />
        </>
      );
    case "pick":
      return (
        <>
          <MatchLive />
          <PickRound
            key={view.attemptId}
            whistle={view.daily.part === 1 ? "half" : "full"}
            partLabel={`Part ${view.daily.part}`}
            format={view.daily.format === "era" ? "era" : "pick"}
            title={view.daily.title}
            prompt={view.daily.prompt}
            attemptId={view.attemptId}
            dailyId={view.daily.id}
            begun={view.begun}
            limitSeconds={view.daily.time_limit_seconds}
            deadlineAt={view.deadlineAt}
            serverNow={view.serverNow}
            questions={view.questions}
            answered={view.answered}
            kit={kit}
            pathKits={pathKits}
          />
        </>
      );
    case "order":
      return (
        <>
          <MatchLive />
          <InOrder
            key={view.attemptId}
            whistle={view.daily.part === 1 ? "half" : "full"}
            partLabel={`Part ${view.daily.part}`}
            prompt={view.daily.prompt}
            attemptId={view.attemptId}
            dailyId={view.daily.id}
            begun={view.begun}
            limitSeconds={view.daily.time_limit_seconds}
            deadlineAt={view.deadlineAt}
            serverNow={view.serverNow}
            items={view.items}
          />
        </>
      );
    case "fulltime": {
      // "Who do you support?" is asked once, right after a first Daily.
      const [choices, rating, guest] = await Promise.all([
        supporter && !supporter.asked ? clubChoices() : null,
        userId ? getRating(userId) : null,
        currentIsGuest(),
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
          top={view.top}
          me={view.me}
          siteUrl={publicEnv().NEXT_PUBLIC_SITE_URL}
          clubChoices={choices}
          featuredClubs={choices ? featuredClubs(choices, title) : []}
          kit={kit}
          myKit={kitOf(supporter?.club ?? null)}
          orderKits={pathKits}
          rating={rating}
          fanOf={clubInTitle(supporter?.club ?? null, title) ? supporter!.club!.name : null}
          testSite={isTestSite()}
          guest={guest}
        />
      );
    }
  }
}

// The big clubs the picker shows after today's two (full time, 22 Oct 2026).
const FEATURED = ["MUN", "LIV", "ARS", "CHE", "MCI", "TOT"];

/** Four clubs for "Who do you support?": today's fixture first, then the big ones. */
function featuredClubs(clubs: Club[], title: string): Club[] {
  const today = clubs.filter((c) => clubInTitle(c, title));
  const big = FEATURED.map((s) => clubs.find((c) => c.short_name === s)).filter((c): c is Club => Boolean(c));
  return [...new Set([...today, ...big])].slice(0, 4);
}

/** Clubs a career path names, to dress in their kits: Rapid picks' paths, or a career path In Order's answers at full time. */
function careerClubNames(view: Awaited<ReturnType<typeof getDailyView>>): string[] {
  if (view.kind === "pick" && view.daily.format === "pick") return view.questions.flatMap((q) => pathOf(q.question) ?? []);
  if (view.kind === "fulltime" && view.order?.daily.template === "career-path") return view.order.slots.map((s) => s.correct);
  return [];
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
    <main className="mx-auto w-full flex-1 max-w-[560px] px-4" aria-busy="true">
      <div className="flex justify-between border-b border-navy pt-3.5 pb-2">
        <span className="label">The Daily</span>
      </div>
      <KeepyUppy label="The Daily" caption="Warming up…" />
    </main>
  );
}
