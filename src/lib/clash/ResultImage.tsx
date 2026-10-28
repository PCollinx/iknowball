import type { ReactNode } from "react";
import { calledLine, fitSlots, outcomeLabel, outcomeOf, slots, verdict, type ResultCardData, type Side } from "@/components/clash/result";
import { BODY, C, DISPLAY } from "@/lib/og/fonts";
import { FOOTBALL_SRC, MISS_SRC } from "@/lib/og/football";
import { formatRating, ratingColours } from "@/lib/profile/rating";

// Clash full time as a 1080 x 1080 image, option D (picked 25 Oct 2026): the
// screen's album page with the score stuck on it (after a challenge, your page
// beside the setter's), closed by the ticket with the score to beat and the
// code on its stub. Drawn by next/og: every text node is one string, no style
// is undefined and every box with children is a flex box, or Satori fails.

export const RESULT_SIZE = 1080;
/** The mocks were drawn at half size: one mock pixel is two here. */
const px = (n: number) => n * 2;
const PAD_X = px(24);
const INNER = RESULT_SIZE - 2 * PAD_X;
const SLOT_EDGE = "#8E9BD6";
const SLOT_FILL = "#E3E8FF";

const label = { fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase" } as const;
const display = { fontFamily: DISPLAY, textTransform: "uppercase" } as const;

export function ResultImage({ d }: { d: ResultCardData }) {
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
        padding: `${px(20)}px ${PAD_X}px ${px(22)}px`,
      }}
    >
      <Masthead d={d} />
      {d.setter ? <HeadToHead d={d} setter={d.setter} /> : <Solo d={d} />}
      <Ticket d={d} />
    </div>
  );
}

function Masthead({ d }: { d: ResultCardData }) {
  const rate = ratingColours(d.rating);
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `${px(2)}px solid ${C.navy}`, paddingBottom: px(8) }}>
      <div style={{ display: "flex", ...display, textTransform: "none", fontSize: px(34), lineHeight: 0.9 }}>
        <span>iKnow</span>
        <span style={{ color: C.teal }}>Ball</span>
      </div>
      <div style={{ display: "flex", alignItems: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", fontSize: px(11), lineHeight: 1.4, ...label }}>
          <span>{d.setter ? `${d.setter.name}'s challenge` : "Clash · Full time"}</span>
          <span>{d.dateLabel}</span>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: px(38),
            height: px(38),
            marginLeft: px(10),
            borderRadius: px(38),
            border: `${px(2.5)}px solid ${C.navy}`,
            background: rate.fill,
            color: rate.text,
            fontFamily: DISPLAY,
            fontSize: px(18),
          }}
        >
          {formatRating(d.rating)}
        </div>
      </div>
    </div>
  );
}

/** A page's kicks, a slot per call, sized to fill `width` x `height`. */
function Slots({ kicks, size, width, height, gap, pad }: { kicks: string; size: number; width: number; height: number; gap: number; pad: number }) {
  const { cols, slot } = fitSlots(Math.max(1, size), width, height, gap, px(60));
  return (
    <div style={{ display: "flex", flexWrap: "wrap", width: cols * slot + (cols - 1) * gap }}>
      {slots(kicks, Math.max(1, size)).map((k, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            width: slot,
            height: slot,
            marginRight: i % cols === cols - 1 ? 0 : gap,
            marginBottom: gap,
            padding: k === null ? 0 : pad,
            ...(k === null ? { border: `${px(1.5)}px dashed ${SLOT_EDGE}`, background: SLOT_FILL } : {}),
          }}
        >
          {k !== null && (
            // eslint-disable-next-line @next/next/no-img-element -- Satori draws <img>, not next/image
            <img src={k === "1" ? FOOTBALL_SRC : MISS_SRC} width={slot - 2 * pad} height={slot - 2 * pad} alt="" />
          )}
        </div>
      ))}
    </div>
  );
}

function ScoreSticker({ right, size, ink, tilt, word = true }: { right: number; size: number; ink: string; tilt: number; word?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        transform: `rotate(${tilt}deg)`,
        background: "#FFFFFF",
        border: `${px(word ? 3 : 2.5)}px solid ${C.navy}`,
        boxShadow: `${px(word ? 5 : 3)}px ${px(word ? 5 : 3)}px 0 ${C.navy}`,
        padding: `${px(3)}px ${px(word ? 12 : 9)}px ${px(word ? 5 : 4)}px`,
        ...display,
      }}
    >
      <span style={{ fontSize: size, lineHeight: 0.8, color: ink }}>{String(right)}</span>
      {word && <span style={{ fontSize: px(24), marginLeft: px(6) }}>RIGHT</span>}
    </div>
  );
}

function Sticker({ children, bg, tilt }: { children: ReactNode; bg: string; tilt: number }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        border: `${px(2)}px solid ${C.navy}`,
        boxShadow: `${px(2)}px ${px(2)}px 0 ${C.navy}`,
        background: bg,
        padding: `${px(2)}px ${px(9)}px`,
        transform: `rotate(${tilt}deg)`,
        fontSize: px(13),
      }}
    >
      {children}
    </div>
  );
}

/** After your own sprint: one album page, the score and the misses on it. */
function Solo({ d }: { d: ResultCardData }) {
  const missed = d.kicks.length - d.right;
  const inner = INNER - 2 * px(2) - 2 * px(14);
  return (
    <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, paddingBottom: px(16) }}>
      <span style={{ marginTop: px(10), fontSize: px(13) }}>{calledLine(d.kicks.length, d.setSize)}</span>
      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          flexGrow: 1,
          marginTop: px(22),
          background: C.mist,
          border: `${px(2)}px solid ${C.navy}`,
          padding: `${px(24)}px ${px(14)}px ${px(10)}px`,
        }}
      >
        <div style={{ position: "absolute", top: -px(13), left: 0, right: 0, display: "flex", justifyContent: "center" }}>
          <div
            style={{
              display: "flex",
              transform: "rotate(-2deg)",
              background: C.tealLight,
              border: `${px(2)}px solid ${C.navy}`,
              boxShadow: `${px(3)}px ${px(3)}px 0 ${C.navy}`,
              padding: `${px(2)}px ${px(12)}px`,
              fontSize: px(17),
              ...display,
            }}
          >
            {d.statLabel}
          </div>
        </div>
        <Slots kicks={d.kicks} size={d.kicks.length} width={inner} height={px(195)} gap={px(3)} pad={px(2)} />
        <div style={{ display: "flex", flexGrow: 1 }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <ScoreSticker right={d.right} size={px(78)} ink={C.royal} tilt={-3} />
          <div style={{ display: "flex", alignItems: "center", marginBottom: px(4) }}>
            <Sticker bg="#FFFFFF" tilt={1}>
              <span style={{ fontFamily: DISPLAY, fontSize: px(17), marginRight: px(4) }}>{String(d.bestRun)}</span>
              <span>best run</span>
            </Sticker>
            <div
              style={{
                display: "flex",
                marginLeft: px(8),
                transform: "rotate(-8deg)",
                border: `${px(3.5)}px solid ${C.red}`,
                color: C.red,
                background: "#FFFFFF",
                fontSize: px(20),
                lineHeight: 1,
                padding: `${px(1)}px ${px(7)}px ${px(3)}px`,
                ...display,
              }}
            >
              {missed === 0 ? "Clean sheet" : `${missed} missed`}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** After someone's challenge: the verdict, then your page beside theirs. */
function HeadToHead({ d, setter }: { d: ResultCardData; setter: Side }) {
  const o = outcomeOf(d.right, setter.right);
  const [lead, tail] = verdict(setter, o);
  const pageWidth = (INNER - px(14)) / 2;
  const sides: { side: Side; mine: boolean }[] = [
    { side: { name: "You", right: d.right, kicks: d.kicks, bestRun: d.bestRun }, mine: true },
    { side: setter, mine: false },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, paddingBottom: px(16) }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: px(10) }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", ...display, fontSize: px(38), lineHeight: 0.9 }}>
            <span>{lead}</span>
            <span style={{ color: C.royal, marginLeft: px(9) }}>{tail}</span>
          </div>
          <span style={{ fontSize: px(15), marginTop: px(4) }}>{calledLine(d.kicks.length, d.setSize)}</span>
        </div>
        <Sticker bg={o.kind === "lost" ? "#FFFFFF" : C.tealLight} tilt={-1.5}>
          <span style={{ fontFamily: DISPLAY, fontSize: px(19), marginRight: px(4) }}>{outcomeLabel(o).split(" ")[0].toUpperCase()}</span>
          <span>{outcomeLabel(o).split(" ").slice(1).join(" ")}</span>
        </Sticker>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: px(30) }}>
        {sides.map(({ side, mine }) => (
          <div
            key={side.name}
            style={{
              position: "relative",
              display: "flex",
              flexDirection: "column",
              width: pageWidth,
              background: C.mist,
              border: `${px(2)}px solid ${mine ? C.royal : C.navy}`,
              padding: `${px(20)}px ${px(8)}px ${px(8)}px`,
            }}
          >
            <div
              style={{
                position: "absolute",
                top: -px(12),
                left: px(10),
                display: "flex",
                transform: "rotate(-3deg)",
                background: mine ? C.tealLight : C.navy,
                color: mine ? C.navy : "#FFFFFF",
                border: `${px(2)}px solid ${C.navy}`,
                boxShadow: `${px(2)}px ${px(2)}px 0 ${C.navy}`,
                padding: `${px(1)}px ${px(9)}px`,
                fontSize: px(16),
                ...display,
              }}
            >
              {side.name}
            </div>
            <Slots kicks={side.kicks} size={Math.max(d.kicks.length, setter.kicks.length)} width={pageWidth - 2 * px(2) - 2 * px(8)} height={px(150)} gap={px(2)} pad={px(1)} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: px(8) }}>
              <ScoreSticker right={side.right} size={px(50)} ink={mine ? C.royal : C.navy} tilt={mine ? -3 : 2} word={false} />
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", fontSize: px(9), lineHeight: 1.4, ...label }}>
                <span>{`${side.kicks.length - side.right} missed`}</span>
                <span>{`run ${side.bestRun}`}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** The ticket: the dare and the link, the score to beat and the code on the stub. */
function Ticket({ d }: { d: ResultCardData }) {
  const challenge = Boolean(d.setter);
  return (
    <div
      style={{
        display: "flex",
        marginTop: "auto",
        border: `${px(2.5)}px solid ${C.navy}`,
        boxShadow: `${px(4)}px ${px(4)}px 0 ${C.navy}`,
        transform: "rotate(0.6deg)",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, padding: `${px(8)}px ${px(12)}px` }}>
        <span style={{ fontSize: px(9), ...label }}>{`Admit one · Challenge · ${d.setSize} players`}</span>
        <div style={{ display: "flex", ...display, fontSize: px(26), lineHeight: 0.95 }}>
          <span>{challenge ? "Your turn." : "Think you know ball?"}</span>
          <span style={{ color: C.royal, marginLeft: px(6) }}>{challenge ? "Pass it on" : "Settle it"}</span>
        </div>
        <span style={{ fontSize: px(9), color: "#3A4466", ...label }}>{d.link}</span>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          width: px(128),
          flexShrink: 0,
          background: C.teal,
          borderLeft: `${px(2.5)}px dashed ${C.navy}`,
          padding: px(6),
        }}
      >
        <span style={{ fontSize: px(9), ...label }}>{challenge ? "Top score" : "To beat"}</span>
        <span style={{ fontFamily: DISPLAY, fontSize: px(44), lineHeight: 0.85 }}>{String(d.toBeat.right)}</span>
        <span style={{ display: "flex", marginTop: px(3), background: C.navy, color: "#FFFFFF", fontFamily: DISPLAY, fontSize: px(12), letterSpacing: "0.08em", padding: `${px(1)}px ${px(5)}px` }}>
          {d.code}
        </span>
      </div>
    </div>
  );
}
