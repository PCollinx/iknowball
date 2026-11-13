import { resultCardData, toBeat, type ResultCardData } from "@/components/clash/result";
import type { Kit } from "@/components/daily/ShirtBack";
import type { ClashView } from "@/lib/clash/data";

type FullTimeView = Extract<ClashView, { kind: "fulltime" }>;

/** The result image's content for a finished sprint, from its full-time view. */
export function clashCard(view: FullTimeView, clubs: Map<number, { name: string; kit: Kit }>, siteUrl: string): ResultCardData {
  return resultCardData({
    stat: view.set.stat,
    items: view.set.items,
    kicks: view.run.kicks,
    right: view.run.right_count,
    name: view.table.find((r) => r.mine)?.name ?? null,
    toBeat: toBeat(view.table, view.run.right_count).right,
    clubs,
    code: view.set.code,
    siteUrl,
  });
}
