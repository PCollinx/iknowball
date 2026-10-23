import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { CLASH_MAX, COUNTED_SPRINTS } from "@/lib/league/week";
import { addDays, gameDate, gameDateClosesAt, matchweekBounds, seasonOf } from "@/lib/time";
import { splitFixture } from "@/components/daily/fixture";
import type { Kit } from "@/components/daily/ShirtBack";
import { fixtureKit, kitOf, type Club } from "./club";
import { overallRating } from "./rating";
import { bestFive, dayScores, PLACEMENT_DAYS, streak, tierFor, type PlayedPart, type TierName } from "./stats";

// Data access for the profile and the favourite club. Reads with the service
// role, always scoped to one player.

export const CLUB_COLUMNS = "id, name, short_name, shirt_colour, number_colour, trim_colour, kit_pattern, kit_collar, in_premier_league";

export type Supporter = {
  club: Club | null;
  /** "Who do you support?" was answered or skipped. */
  asked: boolean;
  /** This season's switch is used up. */
  switchedThisSeason: boolean;
};

/** The clubs in "Who do you support?": the Premier League first, then abroad. */
export async function clubChoices(): Promise<Club[]> {
  const { data, error } = await createAdminClient()
    .from("clubs")
    .select(CLUB_COLUMNS)
    .eq("fan_pick", true)
    .order("in_premier_league", { ascending: false })
    .order("name");
  if (error) throw error;
  return (data ?? []) as Club[];
}

type ProfileRow = {
  username: string | null;
  club_asked_at: string | null;
  club_switched_season: number | null;
  club: Club | null;
};

async function profileRow(userId: string): Promise<ProfileRow | null> {
  const { data, error } = await createAdminClient()
    .from("profiles")
    .select(`username, club_asked_at, club_switched_season, club:clubs(${CLUB_COLUMNS})`)
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return data as ProfileRow | null;
}

function supporterOf(row: ProfileRow | null): Supporter {
  return {
    club: row?.club ?? null,
    asked: Boolean(row?.club_asked_at || row?.club),
    switchedThisSeason: row?.club_switched_season === seasonOf(gameDate()),
  };
}

export async function getSupporter(userId: string): Promise<Supporter> {
  return supporterOf(await profileRow(userId));
}

export type ProfileView = Supporter & {
  username: string | null;
  /** Out of 10, null before a first Daily. */
  rating: number | null;
  /** Null until the player is placed. */
  tier: TierName | null;
  daysPlayed: number;
  streak: number;
  /** Best 5 Daily days plus Clash, out of 600, as on the League tables. */
  weekScore: number;
  weekDays: number;
  weekClash: number;
  leagues: { id: number; name: string; invite_code: string }[];
};

type AttemptJoin = { correct_count: number; dailies: { play_date: string; part: number; answer_count: number } };

/** A player's day scores (out of 100) by date, from every finished part. */
async function playedDays(userId: string): Promise<Map<string, number>> {
  const { data, error } = await createAdminClient()
    .from("attempts")
    .select("correct_count, dailies!inner(play_date, part, answer_count)")
    .eq("user_id", userId)
    .not("submitted_at", "is", null);
  if (error) throw error;
  const parts: PlayedPart[] = ((data ?? []) as unknown as AttemptJoin[]).map((a) => ({
    playDate: a.dailies.play_date,
    part: a.dailies.part,
    correct: a.correct_count,
    answerCount: a.dailies.answer_count,
  }));
  return dayScores(parts);
}

/** A player's overall rating out of 10, or null before a first Daily. */
export async function getRating(userId: string): Promise<number | null> {
  return overallRating(await playedDays(userId));
}

export async function getProfileView(userId: string): Promise<ProfileView> {
  const admin = createAdminClient();
  const today = gameDate();
  const { startsOn, endsOn } = matchweekBounds(today);
  const [row, days, leagues, sprints] = await Promise.all([
    profileRow(userId),
    playedDays(userId),
    admin.from("league_members").select("leagues(id, name, invite_code)").eq("user_id", userId),
    admin
      .from("clash_runs")
      .select("right_count")
      .eq("user_id", userId)
      .gte("started_at", gameDateClosesAt(addDays(startsOn, -1)).toISOString())
      .lt("started_at", gameDateClosesAt(endsOn).toISOString()),
  ]);
  // Clash adds the right answers of the week's best 3 sprints, as on the League tables.
  const best = (sprints.data ?? []).map((r) => r.right_count).sort((a, b) => b - a).slice(0, COUNTED_SPRINTS);
  const weekClash = Math.min(CLASH_MAX, best.reduce((sum, r) => sum + r, 0));
  const thisWeek = [...days].filter(([date]) => date >= startsOn && date <= endsOn).map(([, score]) => score);
  const rating = overallRating(days);

  return {
    ...supporterOf(row),
    username: row?.username ?? null,
    rating,
    tier: rating !== null && days.size >= PLACEMENT_DAYS ? tierFor(rating) : null,
    daysPlayed: days.size,
    streak: streak(days.keys(), today),
    weekScore: bestFive(thisWeek) + weekClash,
    weekDays: thisWeek.length,
    weekClash,
    leagues: ((leagues.data ?? []) as unknown as { leagues: { id: number; name: string; invite_code: string } | null }[])
      .map((m) => m.leagues)
      .filter((l): l is { id: number; name: string; invite_code: string } => l !== null),
  };
}

/** Clubs by id, for dressing shirts in their kits. */
export async function clubsByIds(ids: number[]): Promise<Map<number, Club>> {
  if (!ids.length) return new Map();
  const { data, error } = await createAdminClient().from("clubs").select(CLUB_COLUMNS).in("id", ids);
  if (error) throw error;
  return new Map(((data ?? []) as Club[]).map((c) => [c.id, c]));
}

/** Clubs by display name ("Chelsea"), for dressing a fixture's shirts. */
export async function clubsNamed(names: string[]): Promise<Map<string, Club>> {
  if (!names.length) return new Map();
  const { data, error } = await createAdminClient().from("clubs").select(CLUB_COLUMNS).in("name", names);
  if (error) throw error;
  return new Map(((data ?? []) as Club[]).map((c) => [c.name.toLowerCase(), c]));
}

/** A fixture's kit ("Chelsea v Arsenal"): its clubs half and half. */
export async function kitForFixture(title: string | null): Promise<Kit | null> {
  if (!title) return null;
  const [home, away] = splitFixture(title);
  const clubs = await clubsNamed([home, away].filter((n): n is string => Boolean(n)));
  return fixtureKit(clubs.get(home.toLowerCase()) ?? null, away ? (clubs.get(away.toLowerCase()) ?? null) : null);
}

/** Each of a fixture's clubs in its own kit ("Chelsea v Arsenal"), for the two
 * floating shirts on the Daily sticker; undefined (royal) for a club we don't know. */
export async function kitsForFixture(title: string | null): Promise<[Kit | undefined, Kit | undefined]> {
  if (!title) return [undefined, undefined];
  const [home, away] = splitFixture(title);
  const clubs = await clubsNamed([home, away].filter((n): n is string => Boolean(n)));
  const kit = (name: string | null) => {
    const club = name ? clubs.get(name.toLowerCase()) : undefined;
    return club ? kitOf(club) : undefined;
  };
  return [kit(home), kit(away)];
}
