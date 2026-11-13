import type { ChainLine, ResultCardData } from "@/components/clash/result";
import { ROYAL_KIT } from "@/components/daily/ShirtBack";
import { BODY, C, DISPLAY } from "@/lib/og/fonts";
import { Shirt } from "@/lib/og/Shirt";
import { shirtSvg } from "@/lib/og/shirt-svg";

// The Clash share card, option E "The chain" (Collins, 13 Nov 2026, from
// https://claude.ai/artifact/PahqeKZqGjRTBcuAkLon9a): the live game frozen. The
// score bug (royal Clash tag, teal clock, navy tally), the chain of the run's
// first players with their ticks and crosses (numbers hidden but the first,
// which the game shows anyway), a navy bar with the question, then the dare
// and the challenge link on one line. Drawn by next/og: every text node is one
// string, no style is undefined and every box with children is a flex box.

export const RESULT_SIZE = 1080;
/** The mock's sizes are in cqw: 1cqw is 10.8px here. */
const u = RESULT_SIZE / 100;
const PAD_X = 6 * u;
const SLATE = "#3A4466";
const SKY = "#5CB8FF";
/** Rows the chain has room for; fewer players sit at its foot, like the game's. */
const ROWS = 5;

const label = { fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase" } as const;
const display = { fontFamily: DISPLAY, textTransform: "uppercase" } as const;

const mark = (path: string, colour: string) =>
  `data:image/svg+xml;base64,${Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16"><path d="${path}" fill="none" stroke="${colour}" stroke-width="3" stroke-linecap="square"/></svg>`,
  ).toString("base64")}`;
const TICK = mark("M2.75 8.5 6.25 12l7-8", C.royal);
const CROSS = mark("M4 4l8 8M12 4l-8 8", C.red);

export function ResultImage({ d }: { d: ResultCardData }) {
  // Everything but the chain has a set height; the chain takes the rest.
  const chainH = RESULT_SIZE - 2 - (4.6 * u + 6.4 * u * 0.9 + 3 * u + 10.2 * u + 2.6 * u + 13.2 * u + 17.6 * u);
  const rowH = Math.floor(chainH / ROWS);
  return (
    <div
      style={{
        width: RESULT_SIZE,
        height: RESULT_SIZE,
        display: "flex",
        flexDirection: "column",
        background: "#FFFFFF",
        border: `2px solid ${C.navy}`,
        color: C.navy,
        fontFamily: BODY,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, padding: `${4.6 * u}px ${PAD_X}px 0` }}>
        {/* Logo and what this is */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", fontFamily: DISPLAY, fontSize: 6.4 * u, lineHeight: 0.9 }}>
            <span>iKnow</span>
            <span style={{ color: C.teal }}>Ball</span>
          </div>
          <span style={{ fontSize: 2.4 * u, color: SLATE, ...label }}>Football quiz · Higher or lower</span>
        </div>

        <ScoreBug d={d} />

        {/* The chain: the run's first players, newest at the foot */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            height: chainH,
            marginTop: 2.6 * u,
            border: `${0.5 * u}px solid ${C.navy}`,
            borderBottom: "none",
          }}
        >
          {d.chain.map((line, i) => (
            <Row key={i} line={line} height={rowH} />
          ))}
        </div>

        {/* The question */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            height: 13.2 * u,
            background: C.navy,
            color: "#FFFFFF",
            padding: `0 ${2.6 * u}px`,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ ...display, fontSize: 5 * u, lineHeight: 0.95 }}>{d.ask}</span>
            <span style={{ marginTop: 1 * u, fontSize: 2.2 * u, color: C.tealLight, ...label }}>{`${d.right} right · ${d.missed} missed`}</span>
          </div>
          <span
            style={{
              ...display,
              fontSize: 3.4 * u,
              lineHeight: 1,
              background: "#FFFFFF",
              color: C.navy,
              padding: `${1.2 * u}px ${1.6 * u}px`,
              boxShadow: `${0.5 * u}px ${0.5 * u}px 0 ${SKY}`,
            }}
          >
            Your go
          </span>
        </div>
      </div>

      {/* The dare, and the link on one line (the card is a picture: the message carries the live link) */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: 17.6 * u,
          justifyContent: "center",
          background: C.tealLight,
          borderTop: `${0.6 * u}px solid ${C.navy}`,
          padding: `0 ${PAD_X}px`,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <span style={{ ...display, fontSize: 6 * u, lineHeight: 0.88 }}>{`Can you beat ${d.toBeat}?`}</span>
          <span style={{ fontSize: 2.3 * u, fontWeight: 600 }}>Free · 60 seconds · no sign-up</span>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 1.4 * u,
            background: C.navy,
            color: "#FFFFFF",
            padding: `${1.3 * u}px ${2 * u}px`,
          }}
        >
          <span style={{ fontFamily: DISPLAY, fontSize: 3.6 * u, lineHeight: 1 }}>{d.link}</span>
          <span style={{ fontSize: 2 * u, color: C.tealLight, ...label }}>Same players · one go</span>
        </div>
      </div>
    </div>
  );
}

/** As the sprint's: the royal Clash tag, the teal clock run out, your score on navy. */
function ScoreBug({ d }: { d: ResultCardData }) {
  return (
    <div
      style={{
        display: "flex",
        height: 10.2 * u,
        marginTop: 3 * u,
        border: `${0.6 * u}px solid ${C.navy}`,
        boxShadow: `${0.8 * u}px ${0.8 * u}px 0 ${C.navy}`,
      }}
    >
      <span style={{ display: "flex", alignItems: "center", background: C.royal, color: "#FFFFFF", ...display, fontSize: 3.6 * u, padding: `0 ${2.4 * u}px` }}>Clash</span>
      <span style={{ display: "flex", alignItems: "center", background: C.teal, color: "#FFFFFF", fontFamily: DISPLAY, fontSize: 8 * u, padding: `0 ${2.4 * u}px` }}>0:00</span>
      <div style={{ display: "flex", flexGrow: 1, alignItems: "center", justifyContent: "space-between", background: C.navy, color: "#FFFFFF", padding: `0 ${2.6 * u}px` }}>
        <span style={{ fontSize: 2.2 * u, color: C.tealLight, ...label }}>{d.name ? `${d.name} · right` : "Right"}</span>
        <span style={{ fontFamily: DISPLAY, fontSize: 8 * u, lineHeight: 1 }}>{String(d.right)}</span>
      </div>
    </div>
  );
}

/** One player in the chain: shirt, name and club, his number or "?", and the call that brought him on. */
function Row({ line, height }: { line: ChainLine; height: number }) {
  const kit = line.kit ?? ROYAL_KIT;
  const shirt = Math.round(Math.min(height * 0.62, 6 * u));
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        height,
        borderBottom: `${0.2 * u}px solid ${C.track}`,
        borderLeft: `${1.1 * u}px solid ${line.mark === false ? C.red : C.royal}`,
        padding: `0 ${2 * u}px`,
      }}
    >
      <Shirt src={shirtSvg(kit)} size={shirt} big="" kit={kit} />
      <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, marginLeft: 2 * u }}>
        <span style={{ ...display, fontSize: 4 * u, lineHeight: 1 }}>{line.name}</span>
        {line.club && <span style={{ fontSize: 2.2 * u, color: SLATE }}>{line.club}</span>}
      </div>
      <span style={{ fontFamily: DISPLAY, fontSize: 5 * u, lineHeight: 1, color: SLATE, marginRight: 2 * u }}>{line.value === null ? "?" : String(line.value)}</span>
      <div style={{ display: "flex", width: 4.4 * u, justifyContent: "center" }}>
        {line.mark !== null && (
          // eslint-disable-next-line @next/next/no-img-element -- Satori draws <img>, not next/image
          <img src={line.mark ? TICK : CROSS} width={3.6 * u} height={3.6 * u} alt="" />
        )}
      </div>
    </div>
  );
}
