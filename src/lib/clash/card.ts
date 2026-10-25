import { resultCardData, toBeat, type ResultCardData } from "@/components/clash/result";
import type { ClashView } from "@/lib/clash/data";
import { STATS } from "@/lib/clash/rules";
import { gameDate } from "@/lib/time";

type FullTimeView = Extract<ClashView, { kind: "fulltime" }>;

/** The result image's content for a finished sprint, from its full-time view. */
export function clashCard(view: FullTimeView, rating: number | null, siteUrl: string): ResultCardData {
  const setter = view.table.find((r) => r.setter && !r.mine) ?? null;
  return resultCardData({
    code: view.set.code,
    statLabel: STATS[view.set.stat].label,
    setSize: view.set.items.length,
    right: view.run.right_count,
    kicks: view.run.kicks,
    bestRun: view.run.best_run,
    rating,
    setter: setter && { name: setter.name, right: setter.right, kicks: setter.kicks, bestRun: setter.bestRun },
    toBeat: toBeat(view.table, view.run.right_count),
    playDate: gameDate(new Date(view.run.started_at)),
    siteUrl,
  });
}
