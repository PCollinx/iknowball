// Teaser images for X: the pure parts (reading the form, sizing type, laying
// out the shirts), kept apart from the drawing so they can be tested.

export type TeaserFormat = "wide" | "tall";
export type TeaserKind = "recall" | "order";

/** Pixel sizes. Wide is X's 16:9 in-feed image at 2x; tall is 4:5, which
 * fills more of a phone screen. */
export const FORMATS: Record<TeaserFormat, { width: number; height: number; label: string }> = {
  wide: { width: 1600, height: 900, label: "Wide 16:9" },
  tall: { width: 1080, height: 1350, label: "Tall 4:5" },
};

export const MIN_SHIRTS = 2;
export const MAX_SHIRTS = 12;

export type Teaser = {
  format: TeaserFormat;
  kind: TeaserKind;
  no: number;
  when: string;
  headline: string;
  question: string;
  home: number | null;
  away: number | null;
  /** Recall: how many shirts. Order: the number of names. */
  count: number;
  /** Order: the players to put in order. Recall: the answers, for the reveal. */
  names: string[];
  dare: string;
  aside: string;
};

type Params = Record<string, string | string[] | undefined>;

const one = (p: Params, key: string) => {
  const v = p[key];
  return (Array.isArray(v) ? v[0] : v)?.trim() ?? "";
};
const clip = (s: string, max: number) => s.slice(0, max);
const id = (s: string) => (/^\d+$/.test(s) ? Number(s) : null);
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** Reads a teaser from the form's query string, with safe defaults. */
export function parseTeaser(p: Params): Teaser {
  const kind: TeaserKind = one(p, "kind") === "order" ? "order" : "recall";
  const names = one(p, "names")
    .split(/\r?\n/)
    .map((n) => clip(n.trim(), 30))
    .filter(Boolean)
    .slice(0, MAX_SHIRTS);
  const asked = Number.parseInt(one(p, "count"), 10);
  const count = names.length || clamp(Number.isNaN(asked) ? 6 : asked, MIN_SHIRTS, MAX_SHIRTS);
  return {
    format: one(p, "format") === "tall" ? "tall" : "wide",
    kind,
    no: clamp(Number.parseInt(one(p, "no"), 10) || 1, 1, 999),
    when: clip(one(p, "when"), 24),
    headline: clip(one(p, "headline"), 60),
    question: clip(one(p, "question"), 160),
    home: id(one(p, "home")),
    away: id(one(p, "away")),
    count: clamp(count, MIN_SHIRTS, MAX_SHIRTS),
    names,
    dare: clip(one(p, "dare"), 60),
    aside: clip(one(p, "aside"), 40),
  };
}

/** The query string that draws this teaser. */
export function teaserQuery(t: Teaser): string {
  const q = new URLSearchParams();
  q.set("format", t.format);
  q.set("kind", t.kind);
  q.set("no", String(t.no));
  if (t.when) q.set("when", t.when);
  if (t.headline) q.set("headline", t.headline);
  if (t.question) q.set("question", t.question);
  if (t.home) q.set("home", String(t.home));
  if (t.away) q.set("away", String(t.away));
  q.set("count", String(t.count));
  if (t.names.length) q.set("names", t.names.join("\n"));
  if (t.dare) q.set("dare", t.dare);
  if (t.aside) q.set("aside", t.aside);
  return q.toString();
}

/** What each shirt carries: the big number (or letter) and the nameplate. */
export function shirtLabels(t: Teaser): { big: string; plate: string }[] {
  return Array.from({ length: t.count }, (_, i) => {
    const name = t.names[i] ? surname(t.names[i]) : "";
    if (t.kind === "order") return { big: String.fromCharCode(65 + i), plate: name };
    return { big: String(i + 1), plate: name || "?" };
  });
}

/** The name on a shirt: the surname, or the whole name for one-name players. */
function surname(name: string): string {
  return name.split(/\s+/).pop() ?? name;
}

// Big Shoulders 900 sets about 0.48em a character across a line, spaces
// included; wide letters (W, M) run past that, so wrap on a safe width.
const DISPLAY_EM = 0.48 * 1.15;

/** Lines a text wraps to at a font size, in a box this wide. */
export function linesAt(text: string, size: number, width: number, em = DISPLAY_EM): number {
  const room = width / (size * em);
  let lines = 1;
  let used = 0;
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const need = used ? used + 1 + word.length : word.length;
    if (need > room && used) {
      lines++;
      used = word.length;
    } else used = need;
  }
  return lines;
}

/** The biggest size (in px, down to `min`) at which a text fits in `maxLines`
 * lines, never wider than the box: sized to fit, never squeezed. */
export function fitSize(text: string, width: number, max: number, min: number, maxLines: number, em = DISPLAY_EM): number {
  const longest = Math.max(1, ...text.split(/\s+/).map((w) => w.length));
  let size = Math.min(max, width / (longest * em));
  while (size > min && linesAt(text, size, width, em) > maxLines) size -= 2;
  return Math.max(min, Math.floor(size));
}

/** Columns and shirt width that make the biggest shirts fit a box. */
export function shirtGrid(n: number, width: number, height: number, gap: number): { cols: number; shirt: number } {
  const TALL = 1.04; // the shirt's drawing is 100 x 104
  let best = { cols: 1, shirt: 0 };
  for (let cols = 1; cols <= n; cols++) {
    const rows = Math.ceil(n / cols);
    const byWidth = (width - gap * (cols - 1)) / cols;
    const byHeight = (height - gap * (rows - 1)) / rows / TALL;
    const shirt = Math.floor(Math.min(byWidth, byHeight));
    if (shirt > best.shirt) best = { cols, shirt };
  }
  return best;
}

/** A blank headline takes the clubs' names: "Arsenal and Spurs". */
export function withHeadline(t: Teaser, clubNames: string[]): Teaser {
  return t.headline || !clubNames.length ? t : { ...t, headline: clubNames.join(" and ") };
}
