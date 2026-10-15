/** "Chelsea v Arsenal" → ["Chelsea", "Arsenal"]; anything else stays whole. */
export function splitFixture(title: string): [string, string | null] {
  const m = title.match(/^(.+?)\s+v\s+(.+)$/i);
  return m ? [m[1], m[2]] : [title, null];
}
