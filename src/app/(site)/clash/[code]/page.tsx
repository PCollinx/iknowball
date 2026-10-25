import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { ClashFullTime } from "@/components/clash/FullTime";
import { ClashKickOff } from "@/components/clash/KickOff";
import { ClashMasthead } from "@/components/clash/Masthead";
import { Sprint } from "@/components/clash/Sprint";
import type { Kit } from "@/components/daily/ShirtBack";
import { getClashView, isWeekBest } from "@/lib/clash/data";
import { STATS } from "@/lib/clash/rules";
import { isPreview, previewView } from "@/lib/clash/sample";
import { isTestSite } from "@/lib/daily/sample";
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
type Search = Promise<{ preview?: string }>;

export default function ClashSetPage({ params, searchParams }: { params: Params; searchParams: Search }) {
  return (
    <Suspense fallback={<Loading />}>
      <ClashScreen params={params} searchParams={searchParams} />
    </Suspense>
  );
}

// Reads the session and the clock, so it renders per request.
async function ClashScreen({ params, searchParams }: { params: Params; searchParams: Search }) {
  await connection();
  const { code } = await params;
  // Test sites only: ?preview=solo|challenge|level|lost shows full time with sample data.
  const { preview } = await searchParams;
  const sample = isTestSite() && isPreview(preview) ? preview : null;
  const view = sample ? previewView(sample, code.toUpperCase()) : await getClashView(code.toUpperCase());

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
    case "kickoff": {
      // The challenge's own first call: its opening player's number shows from the first second anyway.
      const [first, second] = view.set.items;
      const clubs = await clubsByIds([first?.club_id, second?.club_id].filter((id): id is number => id != null));
      const kitFor = (id: number | null) => (id !== null && clubs.has(id) ? kitOf(clubs.get(id)!) : undefined);
      const firstCall =
        first && second
          ? { first: { name: first.name, kit: kitFor(first.club_id), value: first.value }, second: { name: second.name, kit: kitFor(second.club_id) } }
          : undefined;
      return <ClashKickOff code={view.set.code} statLabel={STATS[view.set.stat].label} setter={view.setter} firstCall={firstCall} />;
    }
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
      const [rating, weekBest] = sample ? [7.4, sample === "solo"] : await Promise.all([getRating(view.run.user_id), isWeekBest(view.run)]);
      return (
        <ClashFullTime
          code={view.set.code}
          statLabel={STATS[view.set.stat].label}
          setSize={view.set.items.length}
          right={view.run.right_count}
          kicks={view.run.kicks}
          bestRun={view.run.best_run}
          table={view.table}
          siteUrl={publicEnv().NEXT_PUBLIC_SITE_URL}
          rating={rating}
          weekBest={weekBest}
          preview={sample}
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
