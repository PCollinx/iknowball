import type { CSSProperties } from "react";
import { ShirtBack, type Kit } from "./ShirtBack";
import { fitWidth } from "./FixtureTitle";
import { headlineFixture, splitFixture } from "./fixture";
import "./share-card.css";

export type ShareCardData = {
  issue: number;
  dateLabel: string;
  title: string;
  prompt: string;
  found: number;
  total: number;
  timeUsed: string;
  stats: { value: string; key: string }[];
  host: string;
  /** Your club, when it's in the fixture. */
  fanOf?: string | null;
  kit?: Kit | null;
};

export function stampText(short: number): string {
  if (short === 0) return "Full squad";
  return short <= 3 ? `${short} short. So close.` : `${short} short of a full squad`;
}

// Card text runs 90cqw wide; Big Shoulders 900 sets about 0.48em a character
// across a whole line, spaces included.
const LINE_EM = 0.48;

/** Lines the fixture wraps to at a size in cqw, on a card 90cqw wide. */
function linesAt(fixture: string, size: number): number {
  // Wide letters (W, M) run past the average, so wrap on a safe width.
  const room = 90 / (size * LINE_EM * 1.15);
  let lines = 1;
  let used = 0;
  for (const word of fixture.split(" ")) {
    const need = used ? used + 1 + word.length : word.length;
    if (need > room && used) {
      lines++;
      used = word.length;
    } else used = need;
  }
  return lines;
}

/** The fixture's size in cqw: as big as 10.5, one line if it fits at 7 or
 * more, else two lines at most, never wider than the card. */
export function fixtureSize(fixture: string): number {
  let size = Math.min(10.5, 90 / fitWidth(fixture));
  while (size > 7 && linesAt(fixture, size) > 1) size -= 0.25;
  while (size > 4 && linesAt(fixture, size) > 2) size -= 0.25;
  return size;
}

/** Score, a squad of numbered shirts and empty ones: how many, never who. */
export function ShareCard(d: ShareCardData) {
  const fixture = headlineFixture(d.title);
  const [home, away] = splitFixture(fixture);
  const d900 = "font-display uppercase";
  return (
    <div className="sc-card" role="img" aria-label={`iKnowBall share card: ${d.found} of ${d.total} on ${d.title}`}>
      <div className="sc-inner">
        <div className="sc-mast">
          <span className={`${d900} sc-logo`}>
            <b>i</b>KnowBall
          </span>
          <span className="sc-meta">
            The Daily · No. {String(d.issue).padStart(3, "0")}
            <br />
            {d.dateLabel}
            {d.fanOf && (
              <>
                <br />
                <span className="sc-fan">{d.fanOf} fan</span>
              </>
            )}
          </span>
        </div>
        {/* One line when it fits; a very long fixture gets two smaller lines. */}
        <div className={`${d900} sc-fix`} style={{ fontSize: `${fixtureSize(fixture)}cqw` }}>
          {home}
          {away && (
            <>
              {" "}
              <span>v</span> {away}
            </>
          )}
        </div>
        <p className="sc-q">{d.prompt}</p>
        <div className="sc-mid">
          <div>
            <div className={`${d900} sc-score`}>
              {d.found}
              <small>/{d.total}</small>
            </div>
            <span className="sc-lab">Free Recall · {d.timeUsed} used</span>
          </div>
          <div className="sc-right">
            <div className="sc-kitbox">
              <div className="sc-kit" style={{ "--rows": Math.ceil(d.total / 6) } as CSSProperties}>
                {Array.from({ length: d.total }, (_, k) =>
                  k < d.found ? <ShirtBack key={k} kit={d.kit ?? undefined} num={k + 1} /> : <ShirtBack key={k} state="empty" />,
                )}
              </div>
            </div>
            <span className={`${d900} sc-stamp`}>{stampText(d.total - d.found)}</span>
          </div>
        </div>
        <div className="sc-stats">
          {d.stats.map((s) => (
            <div key={s.key}>
              <span className={`${d900} sc-val`}>{s.value}</span>
              <span className="sc-key">{s.key}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="sc-foot">
        <span className={`${d900} sc-dare`}>
          Think you know ball?
          <br />
          Beat {d.found}.
        </span>
        <span className="sc-url">{d.host.toUpperCase()}</span>
      </div>
    </div>
  );
}
