// Game clock. The Daily closes at midnight GMT+1 (West Africa Time, which has
// no daylight saving, so it is GMT+1 all year). Matchweeks run Monday to
// Sunday on the same clock, so midweek Premier League rounds fall inside the
// week that contains them. The database uses the same rule (see
// supabase/migrations: public.game_date()).

export const GAME_UTC_OFFSET_HOURS = 1;
const OFFSET_MS = GAME_UTC_OFFSET_HOURS * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** The Daily's date (YYYY-MM-DD) at a given instant. */
export function gameDate(at: Date = new Date()): string {
  return new Date(at.getTime() + OFFSET_MS).toISOString().slice(0, 10);
}

/** The instant a given game date closes (next midnight GMT+1). */
export function gameDateClosesAt(date: string): Date {
  const midnightUtc = Date.parse(`${date}T00:00:00Z`);
  return new Date(midnightUtc + DAY_MS - OFFSET_MS);
}

/** Monday and Sunday (YYYY-MM-DD) of the matchweek containing a game date. */
export function matchweekBounds(date: string): { startsOn: string; endsOn: string } {
  const d = new Date(`${date}T00:00:00Z`);
  const daysSinceMonday = (d.getUTCDay() + 6) % 7;
  const monday = new Date(d.getTime() - daysSinceMonday * DAY_MS);
  const sunday = new Date(monday.getTime() + 6 * DAY_MS);
  return { startsOn: monday.toISOString().slice(0, 10), endsOn: sunday.toISOString().slice(0, 10) };
}

/** The game date n days after (or before, for negative n) a game date. */
export function addDays(date: string, n: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);
}

/** The season a game date belongs to: 2026 = 2026/27. Seasons turn over on
 * 1 July, like public.game_season() in the database. */
export function seasonOf(date: string): number {
  const [year, month] = date.split("-").map(Number);
  return month < 7 ? year - 1 : year;
}

/** "2026/27" for season 2026. */
export function seasonLabel(season: number): string {
  return `${season}/${String((season + 1) % 100).padStart(2, "0")}`;
}
