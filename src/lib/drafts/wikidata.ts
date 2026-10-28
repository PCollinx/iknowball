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
  return `SELECT ?club ?player ?playerLabel ?playerAltLabel ?st ?start ?end ?dob ?apps ?goals ?links WHERE {
  ?article schema:about ?club; schema:isPartOf <https://en.wikipedia.org/>; schema:name "${title}"@en.
  ?player p:P54 ?st. ?st ps:P54 ?club.
  ?player wdt:P106 wd:${ASSOCIATION_FOOTBALL_PLAYER}.
  OPTIONAL { ?st pq:P580 ?start. }
  OPTIONAL { ?st pq:P582 ?end. }
  # League appearances and goals for the spell, where Wikidata has them (Clash facts).
  OPTIONAL { ?st pq:P1350 ?apps. }
  OPTIONAL { ?st pq:P1351 ?goals. }
  # Without this, big clubs return every player since the 1880s (over 1 MB, cut off mid-answer).
  FILTER((BOUND(?end) && YEAR(?end) >= ${ERA_START_YEAR}) || (!BOUND(?end) && BOUND(?start) && YEAR(?start) >= ${ERA_START_YEAR - 7}))
  OPTIONAL { ?player wdt:P569 ?dob. }
  # How famous: the number of Wikipedia editions with an article on them (Clash draws the best known).
  OPTIONAL { ?player wikibase:sitelinks ?links. }
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
  /** League appearances and goals in the spell; null when Wikidata doesn't say. */
  apps: number | null;
  goals: number | null;
  /** Wikipedia editions with an article on the player: how well known they are. */
  sitelinks: number | null;
};

type Binding = Record<string, { value: string } | undefined>;

const qid = (uri: string) => uri.slice(uri.lastIndexOf("/") + 1);
// Wikidata dates look like "2001-07-01T00:00:00Z"; years with low precision
// come as "2001-01-01". Negative or malformed values are dropped.
const day = (v?: string) => (v && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : null);
// Counts come as decimal strings ("187"); anything odd is dropped.
const count = (v?: string) => (v && /^\d{1,4}$/.test(v) ? Number(v) : null);

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
      apps: count(b.apps?.value),
      goals: count(b.goals?.value),
      sitelinks: count(b.links?.value),
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

/** Where a player plays, as the Daily's pitch lines it up. */
export type Position = "GK" | "DEF" | "MID" | "FWD";

/** Every "position played on team" (P413) label for a batch of players. */
export function positionsQuery(playerQids: string[]): string {
  const values = playerQids.filter((q) => /^Q\d+$/.test(q)).map((q) => `wd:${q}`).join(" ");
  return `SELECT ?player (GROUP_CONCAT(DISTINCT ?posLabel; separator="|") AS ?positions) WHERE {
  VALUES ?player { ${values} }
  ?player wdt:P413 ?pos.
  ?pos rdfs:label ?posLabel. FILTER(LANG(?posLabel) = "en")
} GROUP BY ?player`;
}

const LINE: [RegExp, Position][] = [
  [/goal ?keeper/i, "GK"],
  [/back|defender|sweeper|libero|stopper/i, "DEF"],
  [/midfield|playmaker|regista|mezzala|volante/i, "MID"],
  [/forward|striker|winger|attacker|centre-forward|center forward|false nine/i, "FWD"],
];

/**
 * One line from a player's Wikidata positions ("midfielder|forward"): a keeper
 * is a keeper; otherwise the line most of their positions sit in, and a tie
 * goes to midfield, then defence, then attack.
 */
export function positionFromLabels(labels: string[]): Position | null {
  const lines = labels.map((l) => LINE.find(([re]) => re.test(l))?.[1]).filter((p): p is Position => Boolean(p));
  if (!lines.length) return null;
  if (lines.includes("GK")) return "GK";
  const count = (p: Position) => lines.filter((l) => l === p).length;
  return (["MID", "DEF", "FWD"] as const).reduce((best, p) => (count(p) > count(best) ? p : best));
}

export function parsePositions(json: { results: { bindings: Binding[] } }): Map<string, Position> {
  const out = new Map<string, Position>();
  for (const b of json.results.bindings) {
    if (!b.player || !b.positions) continue;
    const position = positionFromLabels(b.positions.value.split("|"));
    if (position) out.set(qid(b.player.value), position);
  }
  return out;
}

/** Positions for players by Wikidata id, a couple of hundred per query. */
export async function fetchPositions(playerQids: string[]): Promise<Map<string, Position>> {
  const out = new Map<string, Position>();
  for (let i = 0; i < playerQids.length; i += 200) {
    const query = positionsQuery(playerQids.slice(i, i + 200));
    const res = await fetch(WIKIDATA_SPARQL, {
      method: "POST",
      headers: { Accept: "application/sparql-results+json", "Content-Type": "application/x-www-form-urlencoded", "User-Agent": USER_AGENT },
      body: new URLSearchParams({ query }),
      cache: "no-store",
      signal: AbortSignal.timeout(65_000),
    });
    if (!res.ok) throw new Error(`Wikidata answered ${res.status} for positions`);
    for (const [q, p] of parsePositions(await res.json())) out.set(q, p);
  }
  return out;
}
