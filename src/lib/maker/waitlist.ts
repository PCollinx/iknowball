import { addDays, gameDate } from "@/lib/time";

// The maker's Waitlist page (Collins, 1 Nov 2026): who's signed the team sheet,
// worked out from the rows. Pure, so it's tested without a database.

export type WaitlistRow = {
  id: number;
  email: string;
  name: string | null;
  favourite_club: string | null;
  league_name: string | null;
  league_id: number | null;
  created_at: string;
};

export type WaitlistEntry = WaitlistRow & { no: number; date: string };

export type WaitlistSummary = {
  total: number;
  today: number;
  leagues: number;
  /** Sign-ups a day (WAT), from the first day to today, oldest first. */
  days: { date: string; count: number }[];
  /** Clubs by fans, most first; "Neutral" for no club. */
  clubs: { club: string; count: number }[];
  /** Everyone, newest first, with their number in the queue. */
  entries: WaitlistEntry[];
};

export function summarise(rows: WaitlistRow[], now: Date = new Date()): WaitlistSummary {
  const today = gameDate(now);
  // The queue number is the waitlist page's: sign-up order by id.
  const entries = [...rows].sort((a, b) => a.id - b.id).map((r, i) => ({ ...r, no: i + 1, date: gameDate(new Date(r.created_at)) }));

  const perDay = new Map<string, number>();
  for (const e of entries) perDay.set(e.date, (perDay.get(e.date) ?? 0) + 1);
  const days: WaitlistSummary["days"] = [];
  if (entries.length) {
    for (let d = entries.reduce((min, e) => (e.date < min ? e.date : min), today); d <= today; d = addDays(d, 1)) days.push({ date: d, count: perDay.get(d) ?? 0 });
  }

  const byClub = new Map<string, number>();
  for (const e of entries) byClub.set(e.favourite_club ?? "Neutral", (byClub.get(e.favourite_club ?? "Neutral") ?? 0) + 1);
  const clubs = [...byClub].map(([club, count]) => ({ club, count })).sort((a, b) => b.count - a.count || a.club.localeCompare(b.club));

  return {
    total: entries.length,
    today: perDay.get(today) ?? 0,
    leagues: entries.filter((e) => e.league_name).length,
    days,
    clubs,
    entries: entries.reverse(),
  };
}
