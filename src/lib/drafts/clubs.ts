// Clubs whose player histories are imported from Wikidata. Each is found by its
// English Wikipedia article, which is steadier than remembering Wikidata ids.
// Recent and long-serving Premier League clubs; add a line to track another.
export type TrackedClub = { wikipedia: string; name: string; short: string };

export const TRACKED_CLUBS: TrackedClub[] = [
  { wikipedia: "Arsenal F.C.", name: "Arsenal", short: "ARS" },
  { wikipedia: "Aston Villa F.C.", name: "Aston Villa", short: "AVL" },
  { wikipedia: "AFC Bournemouth", name: "Bournemouth", short: "BOU" },
  { wikipedia: "Brentford F.C.", name: "Brentford", short: "BRE" },
  { wikipedia: "Brighton & Hove Albion F.C.", name: "Brighton", short: "BHA" },
  { wikipedia: "Burnley F.C.", name: "Burnley", short: "BUR" },
  { wikipedia: "Chelsea F.C.", name: "Chelsea", short: "CHE" },
  { wikipedia: "Crystal Palace F.C.", name: "Crystal Palace", short: "CRY" },
  { wikipedia: "Everton F.C.", name: "Everton", short: "EVE" },
  { wikipedia: "Fulham F.C.", name: "Fulham", short: "FUL" },
  { wikipedia: "Ipswich Town F.C.", name: "Ipswich", short: "IPS" },
  { wikipedia: "Leeds United F.C.", name: "Leeds", short: "LEE" },
  { wikipedia: "Leicester City F.C.", name: "Leicester", short: "LEI" },
  { wikipedia: "Liverpool F.C.", name: "Liverpool", short: "LIV" },
  { wikipedia: "Manchester City F.C.", name: "Man City", short: "MCI" },
  { wikipedia: "Manchester United F.C.", name: "Man United", short: "MUN" },
  { wikipedia: "Newcastle United F.C.", name: "Newcastle", short: "NEW" },
  { wikipedia: "Nottingham Forest F.C.", name: "Nottingham Forest", short: "NFO" },
  { wikipedia: "Sheffield United F.C.", name: "Sheffield United", short: "SHU" },
  { wikipedia: "Southampton F.C.", name: "Southampton", short: "SOU" },
  { wikipedia: "Sunderland A.F.C.", name: "Sunderland", short: "SUN" },
  { wikipedia: "Tottenham Hotspur F.C.", name: "Spurs", short: "TOT" },
  { wikipedia: "West Ham United F.C.", name: "West Ham", short: "WHU" },
  { wikipedia: "Wolverhampton Wanderers F.C.", name: "Wolves", short: "WOL" },
  { wikipedia: "Blackburn Rovers F.C.", name: "Blackburn", short: "BLB" },
  { wikipedia: "Middlesbrough F.C.", name: "Middlesbrough", short: "MID" },
  { wikipedia: "Stoke City F.C.", name: "Stoke", short: "STK" },
  { wikipedia: "Watford F.C.", name: "Watford", short: "WAT" },
  { wikipedia: "West Bromwich Albion F.C.", name: "West Brom", short: "WBA" },
  { wikipedia: "Norwich City F.C.", name: "Norwich", short: "NOR" },
];
