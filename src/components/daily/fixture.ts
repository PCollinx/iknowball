/** "Chelsea v Arsenal" → ["Chelsea", "Arsenal"]; anything else stays whole. */
export function splitFixture(title: string): [string, string | null] {
  const m = title.match(/^(.+?)\s+v\s+(.+)$/i);
  return m ? [m[1], m[2]] : [title, null];
}

// The names fans actually use, for fixtures too long to set big.
const SHORT: Record<string, string> = {
  "aston villa": "Villa",
  "brighton & hove albion": "Brighton",
  "brighton and hove albion": "Brighton",
  "coventry city": "Coventry",
  "crystal palace": "Palace",
  "hull city": "Hull",
  "ipswich town": "Ipswich",
  "leicester city": "Leicester",
  "manchester city": "Man City",
  "manchester united": "Man United",
  "newcastle united": "Newcastle",
  "nottingham forest": "Forest",
  "sheffield united": "Sheff Utd",
  "tottenham hotspur": "Spurs",
  "west ham united": "West Ham",
  "wolverhampton wanderers": "Wolves",
};

/** Fixtures longer than this use the short names in headings. */
const LONG = 22;

/** The fixture as a heading sets it: full names, or short ones when it's long. */
export function headlineFixture(title: string): string {
  if (title.length <= LONG) return title;
  const [home, away] = splitFixture(title);
  const short = (name: string) => SHORT[name.trim().toLowerCase()] ?? name;
  return away ? `${short(home)} v ${short(away)}` : title;
}
