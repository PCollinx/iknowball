import type { DailyFormat } from "@/lib/daily/score";

/** What each kind of round is called on screen. */
export const FORMAT_NAME: Record<DailyFormat, string> = {
  free_recall: "Free Recall",
  in_order: "In Order",
  pick: "Rapid picks",
  era: "Era picks",
};

/** The task line on the kick-off page. */
export const FORMAT_RULE: Record<DailyFormat, (n: number) => string> = {
  free_recall: (n) => `Name as many as you can. ${n} to find.`,
  in_order: (n) => `Put all ${n} in the right order.`,
  pick: (n) => `${n} questions. Tap the right one, fast.`,
  era: (n) => `${n} players. Tap when they were there.`,
};

/** Part 1 or Part 2 rounds that are tapped, not typed or ordered. */
export const isPick = (format: DailyFormat) => format === "pick" || format === "era";
