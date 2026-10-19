import type { CSSProperties } from "react";
import { RatingBadge } from "@/components/profile/RatingBadge";
import { ShirtBack } from "./ShirtBack";
import { headlineFixture, splitFixture } from "./fixture";
import { fixtureSize, stampText, type ShareCardData } from "./share";
import "./share-card.css";

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
          <span className="sc-right-mast">
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
            <RatingBadge rating={d.rating} className="sc-rate" />
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
            <span className="sc-lab">
              {d.partLabel} · {d.timeUsed} used
            </span>
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
