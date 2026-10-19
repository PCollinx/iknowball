import { longDate } from "@/components/daily/share";

// What the Clash result image carries: full time as you saw it, drawn on the
// server as a 1080 x 1080 PNG (src/lib/clash/ResultImage.tsx).

export type ResultCardData = {
  code: string;
  dateLabel: string;
  statLabel: string;
  right: number;
  kicks: string;
  bestRun: number;
  /** Your overall rating out of 10. */
  rating: number | null;
  /** "playiknowball.com/clash/K7Q2XY", the challenge on the card. */
  link: string;
};

export function resultCardData(d: Omit<ResultCardData, "dateLabel" | "link"> & { playDate: string; siteUrl: string }): ResultCardData {
  const { playDate, siteUrl, ...rest } = d;
  return { ...rest, dateLabel: longDate(playDate), link: `${new URL(siteUrl).host}/clash/${d.code}` };
}

/** The stats strip, as on the full-time screen. */
export function resultStats(d: ResultCardData): { value: string; key: string }[] {
  return [
    { value: String(d.bestRun), key: "Best run" },
    { value: String(d.kicks.length - d.right), key: "Missed" },
    { value: String(d.kicks.length), key: "Answered" },
  ];
}
