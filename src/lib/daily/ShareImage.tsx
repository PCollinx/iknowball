import { headlineFixture, splitFixture } from "@/components/daily/fixture";
import { fixtureSize, linesAt as fixtureLines, stampText, type ShareCardData } from "@/components/daily/share";
import { ROYAL_KIT } from "@/components/daily/ShirtBack";
import { BODY, C, DISPLAY } from "@/lib/og/fonts";
import { Shirt } from "@/lib/og/Shirt";
import { emptyShirtSvg, shirtSvg } from "@/lib/og/shirt-svg";
import { formatRating, ratingColours, scoreInk } from "@/lib/profile/rating";
import { linesAt } from "@/lib/teaser/layout";

// The share card ("Programme cover") as a 1080 x 1080 image, drawn by next/og.
// It follows ShareCard and share-card.css measure for measure: the card's
// sizes are in cqw, and here 1cqw is 10.8px. Satori lays out with flexbox
// only, so the heights the browser works out are worked out here instead.
// Every text node is one string, and no style is undefined: Satori fails on both.

export const SHARE_SIZE = 1080;
const u = SHARE_SIZE / 100;
const BORDER = 2;
const COLS = 6;
/** The rating circle's width in cqw, as .sc-rate. */
const RATE = 9;

const label = { fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase" } as const;

export function ShareImage({ d }: { d: ShareCardData }) {
  const fixture = headlineFixture(d.title);
  const [home, away] = splitFixture(fixture);
  const size = fixtureSize(fixture);
  const inner = SHARE_SIZE - BORDER * 2 - 10 * u;
  const kit = d.kit ?? ROYAL_KIT;
  const rate = ratingColours(d.rating);
  const score = scoreInk(d.points);
  // The masthead is as tall as its tallest side: logo, date lines or the rating.
  const mastH = Math.max(7 * u * 0.9, (d.fanOf ? 3 : 2) * 2.4 * u * 1.35, RATE * u);

  // Room left for the score and shirts once everything else is set.
  const promptLines = linesAt(d.prompt, 2.9 * u, inner, 0.5);
  const used =
    BORDER * 2 +
    4.5 * u + // top padding
    (mastH + 1.6 * u + 0.5 * u) + // masthead
    (2.6 * u + fixtureLines(fixture, size) * size * u * 0.9) +
    (1 * u + promptLines * 2.9 * u * 1.3 + 2 * u + 1.2 * u) +
    (0.35 * u + 1.8 * u + 5.2 * u * 0.9 + 2.1 * u * 1.3 + 2.2 * u) + // stats
    (0.5 * u + 2.6 * u + 5.6 * u * 0.9 * 2 + 2.8 * u); // footer and its rule
  const mid = SHARE_SIZE - used;
  // The score takes the room its digits need (as the card's auto column), the shirts the rest.
  const scoreW = Math.max(`Day score · ${d.timeUsed} used`.length * 2.4 * 0.72 * u, (String(d.points).length * 24 + 4 * 8) * 0.5 * u);
  const right = inner - scoreW - 3 * u;
  const gap = right * 0.014;
  const rows = Math.ceil(d.total / COLS);
  const kitH = mid - 5.2 * u - (1.4 * u + 3.6 * u * 0.9 + 1.5 * u + 1.2 * u + 1 * u);
  const shirt = Math.floor(Math.min((right - gap * (COLS - 1)) / COLS, (kitH - gap * (rows - 1)) / rows / 1.04));
  const hit = shirtSvg(kit);
  const empty = emptyShirtSvg();
  const words = [...home.split(" ").map((w) => ({ w, v: false })), ...(away ? [{ w: "v", v: true }, ...away.split(" ").map((w) => ({ w, v: false }))] : [])];

  return (
    <div
      style={{
        width: SHARE_SIZE,
        height: SHARE_SIZE,
        display: "flex",
        flexDirection: "column",
        background: "#FFFFFF",
        border: `${BORDER}px solid ${C.navy}`,
        color: C.navy,
        fontFamily: BODY,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, padding: `${4.5 * u}px ${5 * u}px 0` }}>
        {/* Masthead */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            borderBottom: `${0.5 * u}px solid ${C.navy}`,
            paddingBottom: 1.6 * u,
          }}
        >
          <div style={{ display: "flex", fontFamily: DISPLAY, fontSize: 7 * u, lineHeight: 0.9 }}>
            <span>iKnow</span>
            <span style={{ color: C.teal }}>Ball</span>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", fontSize: 2.4 * u, lineHeight: 1.35, ...label }}>
              <span>{`The Daily · No. ${String(d.issue).padStart(3, "0")}`}</span>
              <span>{d.dateLabel}</span>
              {d.fanOf && <span style={{ color: C.teal }}>{`${d.fanOf} fan`}</span>}
            </div>
            {/* The overall rating, coloured like a match rating */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: RATE * u,
                height: RATE * u,
                marginLeft: 2 * u,
                borderRadius: RATE * u,
                border: `${0.45 * u}px solid ${C.navy}`,
                background: rate.fill,
                color: rate.text,
                fontFamily: DISPLAY,
                fontSize: 4.4 * u,
                lineHeight: 1,
              }}
            >
              {formatRating(d.rating)}
            </div>
          </div>
        </div>

        {/* Fixture, word by word so it wraps like the card's */}
        <div style={{ display: "flex", flexWrap: "wrap", marginTop: 2.6 * u, fontFamily: DISPLAY, fontSize: size * u, lineHeight: 0.9, textTransform: "uppercase" }}>
          {words.map(({ w, v }, i) => (
            <span key={i} style={{ color: v ? C.royal : C.navy, marginRight: i < words.length - 1 ? "0.22em" : 0 }}>
              {w}
            </span>
          ))}
        </div>
        <div style={{ display: "flex", fontSize: 2.9 * u, lineHeight: 1.3, color: "rgba(12,19,48,0.7)", marginTop: 1 * u, paddingBottom: 2 * u }}>
          {d.prompt}
        </div>
        <div style={{ display: "flex", height: 0.4 * u, background: C.navy }} />
        <div style={{ display: "flex", height: 0.4 * u, background: C.navy, marginTop: 0.4 * u }} />

        {/* Score beside the squad: how many, never who */}
        <div style={{ display: "flex", flexGrow: 1, alignItems: "center", padding: `${2.4 * u}px 0 ${2.8 * u}px` }}>
          <div style={{ display: "flex", flexDirection: "column", width: scoreW, marginRight: 3 * u }}>
            <div style={{ display: "flex", alignItems: "baseline", fontFamily: DISPLAY, lineHeight: 0.78 }}>
              <span
                style={{
                  fontSize: 24 * u,
                  color: score.ink,
                  textShadow: `${0.75 * u}px ${0.75 * u}px 0 ${C.navy}`,
                  ...(score.edge ? { WebkitTextStroke: `${0.35 * u}px ${C.navy}` } : {}),
                }}
              >
                {String(d.points)}
              </span>
              <span style={{ fontSize: 8 * u, textShadow: `${0.5 * u}px ${0.5 * u}px 0 ${C.track}` }}>/100</span>
            </div>
            <span style={{ display: "flex", marginTop: 1.6 * u, fontSize: 2.4 * u, ...label }}>{`Day score · ${d.timeUsed} used`}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", width: right }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {Array.from({ length: rows }, (_, r) => (
                <div key={r} style={{ display: "flex", marginTop: r ? gap : 0, width: shirt * COLS + gap * (COLS - 1) }}>
                  {Array.from({ length: Math.min(COLS, d.total - r * COLS) }, (_, c) => {
                    const k = r * COLS + c;
                    const style = { marginLeft: c ? gap : 0 };
                    return k < d.found ? (
                      <Shirt key={c} src={hit} size={shirt} big={String(k + 1)} kit={kit} style={style} />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element -- Satori draws <img>, not next/image
                      <img key={c} src={empty} width={shirt} height={Math.round(shirt * 1.04)} style={style} alt="" />
                    );
                  })}
                </div>
              ))}
            </div>
            <div
              style={{
                display: "flex",
                marginTop: 1.4 * u,
                marginRight: -1 * u,
                transform: "rotate(-3deg)",
                border: `${0.6 * u}px solid ${C.red}`,
                color: C.red,
                background: "#FFFFFF",
                padding: `${0.6 * u}px ${1.6 * u}px ${0.9 * u}px`,
                fontFamily: DISPLAY,
                fontSize: 3.6 * u,
                lineHeight: 0.9,
                textTransform: "uppercase",
              }}
            >
              {stampText(d.total - d.found)}
            </div>
          </div>
        </div>

        {/* Stats strip */}
        <div style={{ display: "flex", borderTop: `${0.35 * u}px solid ${C.navy}` }}>
          {d.stats.map((s, i) => (
            <div
              key={s.key}
              style={{
                display: "flex",
                flexDirection: "column",
                flex: 1,
                padding: `${1.8 * u}px 0 ${2.2 * u}px ${i ? 2.2 * u : 0}px`,
                ...(i ? { borderLeft: `${0.35 * u}px solid ${C.track}` } : {}),
              }}
            >
              <span style={{ fontFamily: DISPLAY, fontSize: 5.2 * u, lineHeight: 0.9, textTransform: "uppercase", color: s.accent ? C.teal : C.navy }}>{s.value}</span>
              <span style={{ fontSize: 2.1 * u, lineHeight: 1.3, ...label, letterSpacing: "0.1em", color: "rgba(12,19,48,0.7)" }}>{s.key}</span>
            </div>
          ))}
        </div>
      </div>

      {/* The dare */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: C.tealLight,
          color: C.navy,
          borderTop: `${0.5 * u}px solid ${C.navy}`,
          padding: `${2.6 * u}px ${5 * u}px ${2.8 * u}px`,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", fontFamily: DISPLAY, fontSize: 5.6 * u, lineHeight: 0.9, textTransform: "uppercase" }}>
          <span>Think you know ball?</span>
          <span>{`Beat ${d.points}.`}</span>
        </div>
        <span style={{ fontSize: 2.6 * u, fontWeight: 600, letterSpacing: "0.1em" }}>{d.host.toUpperCase()}</span>
      </div>
    </div>
  );
}
