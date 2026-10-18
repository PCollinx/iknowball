import "server-only";
import { fanName, splitFixture } from "@/components/daily/fixture";
import type { Club } from "@/lib/profile/club";
import { normalizeName as normalise } from "@/lib/daily/match";
import { createAdminClient } from "@/lib/supabase/admin";
import { addDays, gameDate } from "@/lib/time";

// Data for the teaser maker. Admin only: the clash check reads answer keys.

const CLUB_COLUMNS = "id, name, short_name, shirt_colour, number_colour, trim_colour, kit_pattern, kit_collar, in_premier_league";

/** Every club with a kit, by name. */
export async function allClubs(): Promise<Club[]> {
  const { data, error } = await createAdminClient().from("clubs").select(CLUB_COLUMNS).order("name");
  if (error) throw error;
  return (data ?? []) as Club[];
}

/** Dailies drafted or scheduled this far ahead count as upcoming. */
const LOOKAHEAD_DAYS = 14;

export type Clash = { date: string; title: string; why: string };

/** Upcoming Dailies a teaser would give away: the same two clubs, or a player
 * who is an answer. Teasers must never post a question from an upcoming Daily. */
export async function upcomingClashes(clubs: Club[], names: string[]): Promise<Clash[]> {
  const today = gameDate();
  const admin = createAdminClient();
  const { data: parts, error } = await admin
    .from("dailies")
    .select("id, play_date, part, title")
    .gte("play_date", today)
    .lte("play_date", addDays(today, LOOKAHEAD_DAYS))
    .order("play_date");
  if (error) throw error;
  if (!parts?.length) return [];

  const clashes: Clash[] = [];
  const picked = new Set(clubs.map((c) => normalise(fanName(c.name))));
  const fixtureOf = new Map<string, string>();
  for (const p of parts) {
    const [home, away] = splitFixture(p.title);
    if (!away) continue;
    fixtureOf.set(p.play_date, p.title);
    const sides = [home, away].map((s) => normalise(fanName(s)));
    if (picked.size && sides.some((s) => picked.has(s)) && (picked.size === 1 || sides.every((s) => picked.has(s))))
      clashes.push({ date: p.play_date, title: p.title, why: picked.size === 1 ? "same club" : "same two clubs" });
  }

  // Surnames, since shirts carry only the surname: warn on any likely match.
  const surname = (n: string) => normalise(n).split(" ").pop() ?? "";
  const wanted = new Set(names.map(surname).filter(Boolean));
  if (wanted.size) {
    const { data: answers, error: aerr } = await admin
      .from("daily_answers")
      .select("daily_id, answer_text")
      .in(
        "daily_id",
        parts.map((p) => p.id),
      );
    if (aerr) throw aerr;
    for (const a of answers ?? []) {
      if (!wanted.has(surname(a.answer_text))) continue;
      const p = parts.find((x) => x.id === a.daily_id)!;
      clashes.push({ date: p.play_date, title: fixtureOf.get(p.play_date) ?? p.title, why: `${a.answer_text} is an answer` });
    }
  }
  return clashes;
}
