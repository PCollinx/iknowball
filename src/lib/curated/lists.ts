import { seasonLabel } from "@/lib/time";

// Template build C (Collins, 30 Oct 2026): the lists kept by hand. Each is
// edited on the maker's Lists page as text, one row a line, fields split by
// "|", and saved whole. Clubs go by our names (clubs.name: "Man United",
// "Spurs"), which is how the drafts find the day's clubs in them.

export type Standing = { season: string; position: number; club: string; points: number | null };
export type GoldenBoot = { season: string; player: string; club: string; goals: number };
export type Captain = { club: string; player: string; from_year: number; to_year: number | null };
export type FamousResult = { played_on: string; home: string; home_goals: number; away_goals: number; away: string };
export type Moment = { player: string; moment: "debut" | "first-goal"; club: string; happened_on: string; born_on: string };

export type CuratedLists = {
  standings: Standing[];
  goldenBoots: GoldenBoot[];
  captains: Captain[];
  results: FamousResult[];
  moments: Moment[];
};

export const LIST_KINDS = ["standings", "golden-boots", "captains", "results", "moments"] as const;
export type ListKind = (typeof LIST_KINDS)[number];

type Row = Standing | GoldenBoot | Captain | FamousResult | Moment;
export type Parsed<T> = { rows: T[]; errors: string[] };

const SEASON = /^(\d{4})\/(\d{2})$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const MOMENTS = { "PL debut": "debut", "first PL goal": "first-goal" } as const;
const MOMENT_TEXT = { debut: "PL debut", "first-goal": "first PL goal" } as const;

/** "1995/96" when the years follow on, else null. */
function season(text: string): string | null {
  const m = SEASON.exec(text);
  return m && (Number(m[1]) + 1) % 100 === Number(m[2]) ? text : null;
}
const isDate = (text: string) => DATE.test(text) && !Number.isNaN(Date.parse(`${text}T00:00:00Z`));
const whole = (text: string, min = 0) => (/^\d+$/.test(text) && Number(text) >= min ? Number(text) : null);

/** The season a date falls in, "2011/12" for 28 Aug 2011. Seasons turn over on 1 July. */
export function seasonOfDate(date: string): string {
  const [y, m] = date.split("-").map(Number);
  return seasonLabel(m < 7 ? y - 1 : y);
}

/** What each list's lines look like, for the page and its errors. */
export const LIST_FORMATS: Record<ListKind, { title: string; line: string; example: string }> = {
  standings: { title: "Final tables", line: "season | place | club | points", example: "2025/26 | 1 | Arsenal | 85" },
  "golden-boots": { title: "Golden Boot", line: "season | player | club | goals", example: "2017/18 | Mohamed Salah | Liverpool | 32" },
  captains: { title: "Club captains", line: "club | player | from–to (to left off for the captain now)", example: "Arsenal | Tony Adams | 1988–2002" },
  results: { title: "Famous results", line: "date | home score–score away", example: "2011-08-28 | Man United 8–2 Arsenal" },
  moments: { title: "Players' moments", line: "player | PL debut or first PL goal | club | date | born", example: "Wayne Rooney | first PL goal | Everton | 2002-10-19 | 1985-10-24" },
};

function parseLine(kind: ListKind, f: string[]): Row | string {
  switch (kind) {
    case "standings": {
      // Points are left off for a season kept only for its champion.
      const [s, place, club, points = ""] = f;
      if (f.length < 3 || f.length > 4) return "needs season | place | club, then points if known";
      if (!season(s)) return `"${s}" isn't a season like 2025/26`;
      const position = whole(place, 1);
      if (!position || position > 24) return `"${place}" isn't a place from 1 to 24`;
      if (points && whole(points) === null) return `"${points}" isn't a points total`;
      return { season: s, position, club, points: points ? whole(points) : null };
    }
    case "golden-boots": {
      const [s, player, club, goals] = f;
      if (f.length !== 4) return "needs season | player | club | goals";
      if (!season(s)) return `"${s}" isn't a season like 2017/18`;
      if (!whole(goals, 1)) return `"${goals}" isn't a goal count`;
      return { season: s, player, club, goals: Number(goals) };
    }
    case "captains": {
      const [club, player, years] = f;
      if (f.length !== 3) return "needs club | player | from–to";
      const m = /^(\d{4})\s*[–-]\s*(\d{4})?$/.exec(years);
      if (!m) return `"${years}" isn't years like 1988–2002 or 2022–`;
      const [from, to] = [Number(m[1]), m[2] ? Number(m[2]) : null];
      if (to !== null && to < from) return `${years} ends before it starts`;
      return { club, player, from_year: from, to_year: to };
    }
    case "results": {
      const [date, score] = f;
      if (f.length !== 2) return "needs date | home score–score away";
      if (!isDate(date)) return `"${date}" isn't a date like 2011-08-28`;
      const m = /^(.+?)\s+(\d{1,2})\s*[–-]\s*(\d{1,2})\s+(.+)$/.exec(score);
      if (!m) return `"${score}" isn't a result like Man United 8–2 Arsenal`;
      return { played_on: date, home: m[1], home_goals: Number(m[2]), away_goals: Number(m[3]), away: m[4] };
    }
    case "moments": {
      const [player, what, club, date, born] = f;
      if (f.length !== 5) return "needs player | PL debut or first PL goal | club | date | born";
      const moment = MOMENTS[what as keyof typeof MOMENTS];
      if (!moment) return `"${what}" should be PL debut or first PL goal`;
      if (!isDate(date) || !isDate(born)) return "dates go like 2002-10-19";
      if (born >= date) return "born after the moment";
      return { player, moment, club, happened_on: date, born_on: born };
    }
  }
}

/** A list's text as rows, with an error for each line that doesn't read. */
export function parseList(kind: "standings", text: string): Parsed<Standing>;
export function parseList(kind: "golden-boots", text: string): Parsed<GoldenBoot>;
export function parseList(kind: "captains", text: string): Parsed<Captain>;
export function parseList(kind: "results", text: string): Parsed<FamousResult>;
export function parseList(kind: "moments", text: string): Parsed<Moment>;
export function parseList(kind: ListKind, text: string): Parsed<Row>;
export function parseList(kind: ListKind, text: string): Parsed<Row> {
  const rows: Row[] = [];
  const errors: string[] = [];
  text.split("\n").forEach((raw, i) => {
    const line = raw.trim();
    if (!line) return;
    const fields = line.split("|").map((x) => x.trim());
    if (fields.some((x) => !x)) {
      errors.push(`Line ${i + 1}: a field is empty.`);
      return;
    }
    const row = parseLine(kind, fields);
    if (typeof row === "string") errors.push(`Line ${i + 1}: ${row}.`);
    else rows.push(row);
  });
  const key = (r: Row) =>
    kind === "standings" ? `${(r as Standing).season} ${(r as Standing).position}`
    : kind === "golden-boots" ? `${(r as GoldenBoot).season} ${(r as GoldenBoot).player}`
    : kind === "results" ? `${(r as FamousResult).played_on} ${(r as FamousResult).home}`
    : kind === "moments" ? `${(r as Moment).player} ${(r as Moment).moment}`
    : null;
  const seen = new Set<string>();
  for (const r of rows) {
    const k = key(r);
    if (k && seen.has(k)) errors.push(`${k} is in twice.`);
    if (k) seen.add(k);
  }
  return { rows, errors };
}

/** Rows back as the page's text, in a steady order. */
export function listToText(kind: ListKind, rows: Row[]): string {
  const line = (r: Row): string => {
    switch (kind) {
      case "standings": {
        const s = r as Standing;
        return [s.season, s.position, s.club, ...(s.points === null ? [] : [s.points])].join(" | ");
      }
      case "golden-boots": {
        const g = r as GoldenBoot;
        return [g.season, g.player, g.club, g.goals].join(" | ");
      }
      case "captains": {
        const c = r as Captain;
        return [c.club, c.player, `${c.from_year}–${c.to_year ?? ""}`].join(" | ");
      }
      case "results": {
        const x = r as FamousResult;
        return `${x.played_on} | ${x.home} ${x.home_goals}–${x.away_goals} ${x.away}`;
      }
      case "moments": {
        const m = r as Moment;
        return [m.player, MOMENT_TEXT[m.moment], m.club, m.happened_on, m.born_on].join(" | ");
      }
    }
  };
  return rows.map(line).join("\n");
}

/** Club names a list uses, to check against the clubs we know. */
export function clubsIn(kind: ListKind, rows: Row[]): string[] {
  return rows.flatMap((r) => (kind === "results" ? [(r as FamousResult).home, (r as FamousResult).away] : [(r as { club: string }).club]));
}
