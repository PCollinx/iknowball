import { ShirtBack } from "./ShirtBack";
import { splitFixture } from "./fixture";
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
};

export function stampText(short: number): string {
  if (short === 0) return "Full squad";
  return short <= 3 ? `${short} short. So close.` : `${short} short of a full squad`;
}

/** Score, a squad of numbered shirts and empty ones: how many, never who. */
export function ShareCard(d: ShareCardData) {
  const [home, away] = splitFixture(d.title);
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
          </span>
        </div>
        <div className={`${d900} sc-fix`}>
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
            <div className="sc-kit">
              {Array.from({ length: d.total }, (_, k) =>
                k < d.found ? <ShirtBack key={k} num={k + 1} /> : <ShirtBack key={k} state="empty" />,
              )}
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
        <span className={`${d900} sc-dare`}>Think you know ball? Beat {d.found}.</span>
        <span className="sc-url">{d.host.toUpperCase()}</span>
      </div>
    </div>
  );
}
