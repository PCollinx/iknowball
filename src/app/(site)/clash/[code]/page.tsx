import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { ClashFullTime } from "@/components/clash/FullTime";
import { ClashKickOff } from "@/components/clash/KickOff";
import { ClashMasthead } from "@/components/clash/Masthead";
import { Sprint } from "@/components/clash/Sprint";
import type { Kit } from "@/components/daily/ShirtBack";
import { getClashView } from "@/lib/clash/data";
import { STATS } from "@/lib/clash/rules";
import { publicEnv } from "@/lib/env";
import { kitOf } from "@/lib/profile/club";
import { clubsByIds, getRating } from "@/lib/profile/data";
import { KeepyUppy } from "@/components/loading/KeepyUppy";
import { MatchLive } from "@/components/nav/MatchLive";

export const metadata: Metadata = {
  title: "Clash · iKnowBall",
  description: "Sixty seconds of Higher or Lower. Beat my score.",
};

type Params = Promise<{ code: string }>;

export default function ClashSetPage({ params }: { params: Params }) {
  return (
    <Suspense fallback={<Loading />}>
      <ClashScreen params={params} />
    </Suspense>
  );
}

// Reads the session and the clock, so it renders per request.
async function ClashScreen({ params }: { params: Params }) {
  await connection();
  const { code } = await params;
  const view = await getClashView(code.toUpperCase());

  switch (view.kind) {
    case "missing":
      return (
        <main className="mx-auto w-full flex-1 max-w-[560px] px-4">
          <ClashMasthead right="Higher or lower" />
          <h1 className="mt-6 font-display text-[64px] leading-[0.9] uppercase">
            No such <span className="text-royal">challenge</span>
          </h1>
          <p className="mt-3 text-lg">That link doesn&apos;t match a sprint. Check it, or start your own.</p>
          <Link href="/clash" className="mt-5 block bg-royal sash p-3.5 text-center font-display text-[28px] text-white uppercase">
            New sprint
          </Link>
        </main>
      );
    case "kickoff":
      return <ClashKickOff code={view.set.code} statLabel={STATS[view.set.stat].label} setter={view.setter} />;
    case "play": {
      const ids = [...new Set(view.set.items.map((i) => i.club_id).filter((id): id is number => id !== null))];
      const clubs = await clubsByIds(ids);
      const kits: Record<number, Kit> = Object.fromEntries([...clubs].map(([id, club]) => [id, kitOf(club)]));
      return (
        <>
          <MatchLive />
          <Sprint
            key={view.run.id}
            runId={view.run.id}
            statLabel={STATS[view.set.stat].label}
            shown={{ name: view.shown.name, clubId: view.shown.club_id, value: view.shown.value }}
            next={view.next}
            deadlineAt={view.run.deadline_at}
            serverNow={view.serverNow}
            kicks={view.run.kicks}
            currentRun={view.run.current_run}
            bestRun={view.run.best_run}
            kits={kits}
          />
        </>
      );
    }
    case "fulltime": {
      const rating = await getRating(view.run.user_id);
      return (
        <ClashFullTime
          code={view.set.code}
          statLabel={STATS[view.set.stat].label}
          right={view.run.right_count}
          kicks={view.run.kicks}
          bestRun={view.run.best_run}
          table={view.table}
          siteUrl={publicEnv().NEXT_PUBLIC_SITE_URL}
          rating={rating}
        />
      );
    }
  }
}

function Loading() {
  return (
    <main className="mx-auto w-full flex-1 max-w-[560px] px-4" aria-busy="true">
      <div className="flex justify-between border-b border-navy pt-3.5 pb-2">
        <span className="label">Clash · Sprint</span>
      </div>
      <KeepyUppy label="Clash" caption="Lining up the players…" />
    </main>
  );
}
