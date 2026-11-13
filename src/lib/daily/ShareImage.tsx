import { fixtureSize, scoredBy, type ShareCardData } from "@/components/daily/share";
import { ROYAL_KIT } from "@/components/daily/ShirtBack";
import { BODY, C, DISPLAY } from "@/lib/og/fonts";
import { Shirt } from "@/lib/og/Shirt";
import { shirtSvg } from "@/lib/og/shirt-svg";
import { linesAt } from "@/lib/teaser/layout";

// The share card ("The dare, match first", Collins, 13 Nov 2026) as a
// 1080 x 1080 image, drawn by next/og. It follows ShareCard and
// share-card.css measure for measure: the card's sizes are in cqw, and here
// 1cqw is 10.8px. Satori lays out with flexbox only, so the room left for the
// score and shirts (what the card's container query works out) is worked out
// here. Every text node is one string, and no style is undefined: Satori fails on both.

export const SHARE_SIZE = 1080;
const u = SHARE_SIZE / 100;
const BORDER = 2;
const SLATE = "#3A4466";
/** Barlow 600 runs about 0.5em a character across a line. */
const BODY_EM = 0.5;
const Q_SIZE = 3.8 * u;

const label = { fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase" } as const;

export function ShareImage({ d }: { d: ShareCardData }) {
  const inner = SHARE_SIZE - BORDER * 2 - 12 * u;
  const fix = fixtureSize(d.fixture) * u;
  const questions = [
    { half: "1st half", text: d.first },
    ...(d.second ? [{ half: "2nd half", text: d.second }] : []),
  ];
  const qWidth = inner - 2.6 * u;
  const qHeight =
    2.4 * u + 3 * u + (questions.length - 1) * 1.8 * u + questions.reduce((h, q) => h + 2.1 * u + 0.6 * u + linesAt(q.text, Q_SIZE, qWidth, BODY_EM) * Q_SIZE * 1.25, 0);
  const used =
    BORDER * 2 +
    5.5 * u + // top padding
    6.4 * u * 0.9 + // logo row
    (5 * u + 2.4 * u * 1.2 + 1 * u + fix * 0.9) + // today's match
    qHeight +
    (0.6 * u + 3 * u + 7 * u * 0.88 + 1 * u + 2.5 * u * 1.3 + 3.4 * u); // the dare
  const row = SHARE_SIZE - used;
  // As the card: the number at 18cqw of the row, or 52% of its height.
  const rowW = inner;
  const n = Math.min(0.18 * rowW, 0.52 * row);
  const shirt = Math.floor(Math.min((0.8 * row) / 1.04, rowW * 0.2));
  const kits = d.kits.map((k) => k ?? ROYAL_KIT);

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
      <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, padding: `${5.5 * u}px ${6 * u}px 0` }}>
        {/* Logo and date */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", fontFamily: DISPLAY, fontSize: 6.4 * u, lineHeight: 0.9 }}>
            <span>iKnow</span>
            <span style={{ color: C.teal }}>Ball</span>
          </div>
          <span style={{ fontSize: 2.4 * u, color: SLATE, ...label }}>{`Football quiz · ${d.dateLabel}`}</span>
        </div>

        {/* Today's match */}
        <span style={{ display: "flex", marginTop: 5 * u, fontSize: 2.4 * u, lineHeight: 1.2, color: SLATE, ...label }}>Today&apos;s match</span>
        <div style={{ display: "flex", marginTop: 1 * u, fontFamily: DISPLAY, fontSize: fix, lineHeight: 0.9, textTransform: "uppercase", whiteSpace: "nowrap" }}>
          {d.fixture}
        </div>

        {/* The score beside the two clubs' shirts */}
        <div style={{ display: "flex", alignItems: "center", height: row, flexShrink: 0 }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              background: C.navy,
              color: "#FFFFFF",
              padding: `${0.026 * row}px ${0.036 * rowW}px ${0.03 * row}px`,
              boxShadow: `${0.013 * rowW}px ${0.013 * rowW}px 0 ${C.tealLight}`,
              marginRight: 0.03 * rowW,
            }}
          >
            <span style={{ fontSize: 0.026 * rowW, color: C.tealLight, ...label }}>{scoredBy(d.name)}</span>
            <div style={{ display: "flex", alignItems: "baseline", marginTop: 0.01 * row, fontFamily: DISPLAY, lineHeight: 0.8 }}>
              <span style={{ fontSize: n }}>{String(d.points)}</span>
              <span style={{ fontSize: n * 0.38, color: C.track }}>/100</span>
            </div>
          </div>
          <div style={{ display: "flex", flexGrow: 1, justifyContent: "center" }}>
            {kits.map((kit, i) => (
              <Shirt key={i} src={shirtSvg(kit)} size={shirt} big="?" kit={kit} style={{ marginLeft: i ? 0.015 * rowW : 0 }} />
            ))}
          </div>
        </div>

        {/* Both halves' questions */}
        <div style={{ display: "flex", flexDirection: "column", padding: `${2.4 * u}px 0 ${3 * u}px` }}>
          {questions.map((q, i) => (
            <div
              key={q.half}
              style={{
                display: "flex",
                flexDirection: "column",
                marginTop: i ? 1.8 * u : 0,
                borderLeft: `${0.8 * u}px solid ${C.navy}`,
                paddingLeft: 1.8 * u,
              }}
            >
              <span style={{ fontSize: 2.1 * u, lineHeight: 1, marginBottom: 0.6 * u, color: SLATE, ...label }}>{q.half}</span>
              <span style={{ fontSize: Q_SIZE, fontWeight: 600, lineHeight: 1.25 }}>{q.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* The dare */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          background: C.tealLight,
          borderTop: `${0.6 * u}px solid ${C.navy}`,
          padding: `${3 * u}px ${6 * u}px ${3.4 * u}px`,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontFamily: DISPLAY, fontSize: 7 * u, lineHeight: 0.88, textTransform: "uppercase" }}>{`Can you beat ${d.points}?`}</span>
          <span style={{ marginTop: 1 * u, fontSize: 2.5 * u, fontWeight: 600 }}>Free · 2 minutes · no sign-up</span>
        </div>
        <span style={{ display: "flex", fontFamily: DISPLAY, fontSize: 3.4 * u, lineHeight: 1, background: C.navy, color: "#FFFFFF", padding: `${1.4 * u}px ${2 * u}px` }}>{d.host}</span>
      </div>
    </div>
  );
}
