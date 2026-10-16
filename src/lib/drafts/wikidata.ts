// Reads player club histories from the Wikidata query service (CC0 data).
// Pure parsing lives here so it can be tested without the network.

// Overridable so local tests can point the import at a stand-in server.
export const WIKIDATA_SPARQL = process.env.WIKIDATA_SPARQL_URL || "https://query.wikidata.org/sparql";
const USER_AGENT = "iKnowBall/0.1 (https://playiknowball.com; data import)";
const ASSOCIATION_FOOTBALL_PLAYER = "Q937857";

/** PL era only: spells still running into the 1992/93 season, or open-ended ones from 1985 on. */
export const ERA_START_YEAR = 1992;

/** Every footballer with a "member of sports team" statement for one club in the PL era. */
export function clubPlayersQuery(wikipediaTitle: string): string {
  const title = wikipediaTitle.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `SELECT ?club ?player ?playerLabel ?playerAltLabel ?st ?start ?end ?dob WHERE {
  ?article schema:about ?club; schema:isPartOf <https://en.wikipedia.org/>; schema:name "${title}"@en.
  ?player p:P54 ?st. ?st ps:P54 ?club.
  ?player wdt:P106 wd:${ASSOCIATION_FOOTBALL_PLAYER}.
  OPTIONAL { ?st pq:P580 ?start. }
  OPTIONAL { ?st pq:P582 ?end. }
  # Without this, big clubs return every player since the 1880s (over 1 MB, cut off mid-answer).
  FILTER((BOUND(?end) && YEAR(?end) >= ${ERA_START_YEAR}) || (!BOUND(?end) && BOUND(?start) && YEAR(?start) >= ${ERA_START_YEAR - 7}))
  OPTIONAL { ?player wdt:P569 ?dob. }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}`;
}

export type Spell = {
  clubQid: string;
  playerQid: string;
  name: string;
  aliases: string[];
  statement: string;
  joinedOn: string | null;
  leftOn: string | null;
  dateOfBirth: string | null;
};

type Binding = Record<string, { value: string } | undefined>;

const qid = (uri: string) => uri.slice(uri.lastIndexOf("/") + 1);
// Wikidata dates look like "2001-07-01T00:00:00Z"; years with low precision
// come as "2001-01-01". Negative or malformed values are dropped.
const day = (v?: string) => (v && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : null);

export function parseClubPlayers(json: { results: { bindings: Binding[] } }): Spell[] {
  const spells: Spell[] = [];
  for (const b of json.results.bindings) {
    if (!b.club || !b.player || !b.st || !b.playerLabel) continue;
    const playerQid = qid(b.player.value);
    const name = b.playerLabel.value.trim();
    // With no English label, the label service returns the bare id.
    if (!name || name === playerQid) continue;
    const aliases = (b.playerAltLabel?.value ?? "")
      .split(", ")
      .map((a) => a.trim())
      .filter((a) => a.length >= 3 && a !== name);
    spells.push({
      clubQid: qid(b.club.value),
      playerQid,
      name,
      aliases: [...new Set(aliases)],
      statement: qid(b.st.value),
      joinedOn: day(b.start?.value),
      leftOn: day(b.end?.value),
      dateOfBirth: day(b.dob?.value),
    });
  }
  // A statement can repeat when a player has two birth dates on record.
  const seen = new Set<string>();
  return spells.filter((s) => !seen.has(s.statement) && seen.add(s.statement));
}

export async function fetchClubPlayers(wikipediaTitle: string): Promise<Spell[]> {
  const url = `${WIKIDATA_SPARQL}?query=${encodeURIComponent(clubPlayersQuery(wikipediaTitle))}`;
  const res = await fetch(url, {
    headers: { Accept: "application/sparql-results+json", "User-Agent": USER_AGENT },
    cache: "no-store",
    // Wikidata gives up on a query after 60 s anyway; don't let one club eat the run.
    signal: AbortSignal.timeout(65_000),
  });
  if (!res.ok) throw new Error(`Wikidata answered ${res.status} for ${wikipediaTitle}`);
  return parseClubPlayers(await res.json());
}
