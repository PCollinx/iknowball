import type { Week } from "@/lib/league/data";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const parts = (date: string) => date.split("-").map(Number);

/** "Mon 13 to Sun 19 Oct", or "Mon 27 Oct to Sun 2 Nov" across a month end. */
export function weekLabel(week: Pick<Week, "startsOn" | "endsOn">): string {
  const [, m1, d1] = parts(week.startsOn);
  const [, m2, d2] = parts(week.endsOn);
  return m1 === m2 ? `Mon ${d1} to Sun ${d2} ${MONTHS[m2 - 1]}` : `Mon ${d1} ${MONTHS[m1 - 1]} to Sun ${d2} ${MONTHS[m2 - 1]}`;
}
