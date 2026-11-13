import { ShirtBack } from "./ShirtBack";
import { fixtureSize, scoredBy, type ShareCardData } from "./share";
import "./share-card.css";

/** The dare, match first (Collins, 13 Nov 2026): today's match, the score
 * beside the two clubs' shirts, both halves' questions, then the dare. */
export function ShareCard(d: ShareCardData) {
  return (
    <div className="sc-card" role="img" aria-label={`iKnowBall share card: ${d.fixture}, ${d.points} out of 100`}>
      <div className="sc-inner">
        <div className="sc-top">
          <span className="sc-logo font-display">
            iKnow<b>Ball</b>
          </span>
          <span className="sc-lbl">Football quiz · {d.dateLabel}</span>
        </div>
        <span className="sc-lbl sc-match">Today&apos;s match</span>
        <div className="sc-fix font-display uppercase" style={{ fontSize: `${fixtureSize(d.fixture)}cqw` }}>
          {d.fixture}
        </div>
        <div className="sc-row">
          <div className="sc-box">
            <span className="sc-who">{scoredBy(d.name)}</span>
            <span className="sc-n font-display">
              {d.points}
              <small>/100</small>
            </span>
          </div>
          <div className="sc-kits">
            <ShirtBack kit={d.kits[0]} num="?" />
            <ShirtBack kit={d.kits[1]} num="?" />
          </div>
        </div>
        <ol className="sc-qs">
          <li>
            <span className="sc-half">1st half</span>
            {d.first}
          </li>
          {d.second && (
            <li>
              <span className="sc-half">2nd half</span>
              {d.second}
            </li>
          )}
        </ol>
      </div>
      <div className="sc-foot">
        <div>
          <span className="sc-dare font-display uppercase">Can you beat {d.points}?</span>
          <span className="sc-small">Free · 2 minutes · no sign-up</span>
        </div>
        <span className="sc-url font-display">{d.host}</span>
      </div>
    </div>
  );
}
