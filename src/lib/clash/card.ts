import { resultCardData, type ResultCardData } from "@/components/clash/result";
import type { ClashView } from "@/lib/clash/data";
import { STATS } from "@/lib/clash/rules";
import { gameDate } from "@/lib/time";

type FullTimeView = Extract<ClashView, { kind: "fulltime" }>;

/** The result image's content for a finished sprint, from its full-time view. */
export function clashCard(view: FullTimeView, rating: number | null, siteUrl: string): ResultCardData {
  return resultCardData({
    code: view.set.code,
    statLabel: STATS[view.set.stat].label,
    right: view.run.right_count,
    kicks: view.run.kicks,
    bestRun: view.run.best_run,
    rating,
    playDate: gameDate(new Date(view.run.started_at)),
    siteUrl,
  });
}
