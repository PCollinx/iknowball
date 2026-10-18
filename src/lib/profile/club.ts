import type { Kit, KitPattern } from "@/components/daily/ShirtBack";

// A club as the profile and the Daily see it: its name and shirt colours.

export type Club = {
  id: number;
  name: string;
  short_name: string;
  shirt_colour: string;
  number_colour: string;
  trim_colour: string | null;
  kit_pattern: KitPattern;
  in_premier_league: boolean;
};

/** The kit the Daily's answer shirts wear: half-and-half in the fixture's two
 * clubs ("played for both"), one club's kit if only one is known, else none. */
export function fixtureKit(home: Club | null, away: Club | null): Kit | null {
  if (home && away) return { ...kitOf(home), half: kitOf(away) };
  return home || away ? kitOf(home ?? away) : null;
}

/** True when a Daily title ("Chelsea v Arsenal") names the club. */
export function clubInTitle(club: Club | null, title: string): boolean {
  if (!club) return false;
  const name = club.name.toLowerCase();
  return title
    .toLowerCase()
    .split(/\s+v\s+/)
    .some((side) => side.trim() === name);
}

/** Shirt colours for a club; neutrals wear the app's own royal and teal. */
export function kitOf(club: Club | null): Kit {
  if (!club) return NEUTRAL_KIT;
  return { shirt: club.shirt_colour, number: club.number_colour, trim: club.trim_colour, pattern: club.kit_pattern };
}

export const NEUTRAL_KIT: Kit = { shirt: "#1F48D6", number: "#7FE3E0", trim: "#00A3A3", pattern: "plain" };
