// A club as the profile and the Daily see it: its name and shirt colours.

export type Club = {
  id: number;
  name: string;
  short_name: string;
  shirt_colour: string;
  number_colour: string;
  trim_colour: string | null;
  in_premier_league: boolean;
};

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
export function kitOf(club: Club | null): { shirt: string; number: string; trim: string | null } {
  if (!club) return NEUTRAL_KIT;
  return { shirt: club.shirt_colour, number: club.number_colour, trim: club.trim_colour };
}

export const NEUTRAL_KIT = { shirt: "#1F48D6", number: "#7FE3E0", trim: null };
