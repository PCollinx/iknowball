import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { gameDate, matchweekBounds, seasonOf } from "@/lib/time";
import type { Club } from "./club";
import { bestFive, dayScores, PLACEMENT_DAYS, streak, tierFor, type PlayedPart, type TierName } from "./stats";

// Data access for the profile and the favourite club. Reads with the service
// role, always scoped to one player.

const CLUB_COLUMNS = "id, name, short_name, shirt_colour, number_colour, trim_colour, kit_pattern, kit_collar, in_premier_league";

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
  rating: number;
  /** Null until the player is placed. */
  tier: TierName | null;
  daysPlayed: number;
  streak: number;
  weekScore: number;
  weekDays: number;
  leagues: { id: number; name: string }[];
};

type AttemptJoin = { correct_count: number; dailies: { play_date: string; part: number; answer_count: number } };

export async function getProfileView(userId: string): Promise<ProfileView> {
  const admin = createAdminClient();
  const [row, rating, attempts, leagues] = await Promise.all([
    profileRow(userId),
    admin.from("ratings").select("rating").eq("user_id", userId).maybeSingle(),
    admin
      .from("attempts")
      .select("correct_count, dailies!inner(play_date, part, answer_count)")
      .eq("user_id", userId)
      .not("submitted_at", "is", null),
    admin.from("league_members").select("leagues(id, name)").eq("user_id", userId),
  ]);
  if (attempts.error) throw attempts.error;

  const parts: PlayedPart[] = ((attempts.data ?? []) as unknown as AttemptJoin[]).map((a) => ({
    playDate: a.dailies.play_date,
    part: a.dailies.part,
    correct: a.correct_count,
    answerCount: a.dailies.answer_count,
  }));
  const days = dayScores(parts);
  const today = gameDate();
  const { startsOn, endsOn } = matchweekBounds(today);
  const thisWeek = [...days].filter(([date]) => date >= startsOn && date <= endsOn).map(([, score]) => score);
  const ratingValue = (rating.data?.rating as number | undefined) ?? 1000;

  return {
    ...supporterOf(row),
    username: row?.username ?? null,
    rating: ratingValue,
    tier: days.size >= PLACEMENT_DAYS ? tierFor(ratingValue) : null,
    daysPlayed: days.size,
    streak: streak(days.keys(), today),
    weekScore: bestFive(thisWeek),
    weekDays: thisWeek.length,
    leagues: ((leagues.data ?? []) as unknown as { leagues: { id: number; name: string } | null }[])
      .map((m) => m.leagues)
      .filter((l): l is { id: number; name: string } => l !== null),
  };
}

/** Clubs by display name ("Chelsea"), for dressing a fixture's shirts. */
export async function clubsNamed(names: string[]): Promise<Map<string, Club>> {
  if (!names.length) return new Map();
  const { data, error } = await createAdminClient().from("clubs").select(CLUB_COLUMNS).in("name", names);
  if (error) throw error;
  return new Map(((data ?? []) as Club[]).map((c) => [c.name.toLowerCase(), c]));
}
