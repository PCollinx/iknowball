import { newCode } from "@/lib/clash/rules";
import type { Week } from "@/lib/league/data";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const parts = (date: string) => date.split("-").map(Number);

/** "Mon 13 to Sun 19 Oct", or "Mon 27 Oct to Sun 2 Nov" across a month end. */
export function weekLabel(week: Pick<Week, "startsOn" | "endsOn">): string {
  const [, m1, d1] = parts(week.startsOn);
  const [, m2, d2] = parts(week.endsOn);
  return m1 === m2 ? `Mon ${d1} to Sun ${d2} ${MONTHS[m2 - 1]}` : `Mon ${d1} ${MONTHS[m1 - 1]} to Sun ${d2} ${MONTHS[m2 - 1]}`;
}

/** League codes are 6 characters starting "IKB" (IKB7QX, Collins, 26 Oct 2026), so a code reads as a league.
 * Leagues made before then keep their old codes. */
export function newLeagueCode(random = Math.random): string {
  return `IKB${newCode(random).slice(0, 3)}`;
}

/** A code as typed or pasted: "ikb 7qx" and "IKB-7QX" give "IKB7QX", and just "7QX" gets its IKB back. */
export function cleanCode(input: string): string {
  const code = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return code.length === 3 ? `IKB${code}` : code;
}
