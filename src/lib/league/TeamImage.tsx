import { shirtName, type Kit } from "@/components/daily/ShirtBack";
import type { TableLine } from "@/lib/league/data";
import { BODY, C, DISPLAY } from "@/lib/og/fonts";
import { Shirt } from "@/lib/og/Shirt";
import { emptyShirtSvg, shirtSvg } from "@/lib/og/shirt-svg";
import { kitOf } from "@/lib/profile/club";

// The team of the week as a 1080 x 1080 card (D1, picked 27 Oct 2026): the
// masthead, the headline with this week's Premier League matchweek stamped
// beside it, the top 11 on the pitch as on /league/everyone, and the ticket
// along the foot. Drawn by next/og: every text node is one string, no style is
// undefined and every box with children is a flex box, or Satori fails.

export const TEAM_SIZE = 1080;
const PAD = 48;
const PITCH_W = TEAM_SIZE - 2 * PAD - 12;
const PITCH_H = 700;
const SHIRT = Math.round(PITCH_W * 0.13);
/** Places on the card's pitch in %: the page's 4-4-2, rows spread to fit the bigger shirts. */
const SPOTS = [
  [35, 4], [65, 4],
  [12, 28], [37, 28], [63, 28], [88, 28],
  [12, 52], [37, 52], [63, 52], [88, 52],
  [50, 76],
] as const;
const EMPTY_KIT: Kit = { shirt: C.mist, number: C.track };
const LOGO_KIT: Kit = { shirt: C.royal, number: C.tealLight, trim: C.tealLight };

export type TeamCardData = {
  xi: (TableLine | null)[];
  /** "Mon 26 Oct to Sun 1 Nov". */
  weekLabel: string;
  players: number;
  /** This week's Premier League matchweek, when it has fixtures. */
  round: number | null;
  /** The site's address without the scheme, for the ticket's stub. */
  host: string;
};

const label = { fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase" } as const;
const display = { fontFamily: DISPLAY, textTransform: "uppercase" } as const;

export function TeamImage({ d }: { d: TeamCardData }) {
  return (
    <div
      style={{
        width: TEAM_SIZE,
        height: TEAM_SIZE,
        display: "flex",
        flexDirection: "column",
        background: "#FFFFFF",
        border: `6px solid ${C.navy}`,
        color: C.navy,
        fontFamily: BODY,
      }}
    >
      <Masthead d={d} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", padding: `18px ${PAD}px 0` }}>
        <div style={{ display: "flex", ...display, fontSize: 88, lineHeight: 0.84 }}>
          <span>Team of the&nbsp;</span>
          <span style={{ color: C.royal }}>week</span>
        </div>
        {d.round !== null && (
          <div style={{ display: "flex", ...display, background: C.red, color: "#FFFFFF", padding: "8px 14px", fontSize: 28, transform: "rotate(3deg)" }}>
            {`Matchweek ${d.round}`}
          </div>
        )}
      </div>
      <Pitch xi={d.xi} />
      <Ticket host={d.host} />
    </div>
  );
}

function Masthead({ d }: { d: TeamCardData }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", padding: `28px ${PAD}px 0` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <Shirt src={shirtSvg(LOGO_KIT)} size={50} big="10" kit={LOGO_KIT} />
          <div style={{ display: "flex", ...display, fontSize: 44, marginLeft: 12 }}>
            <span>iKnow</span>
            <span style={{ color: C.royal }}>Ball</span>
          </div>
        </div>
        <span style={{ ...label, fontSize: 20 }}>{`${d.weekLabel} · ${d.players.toLocaleString("en-GB")} played`}</span>
      </div>
      {/* A double rule, as on the programme's pages. */}
      <div style={{ display: "flex", height: 8, borderTop: `2px solid ${C.navy}`, borderBottom: `2px solid ${C.navy}` }} />
    </div>
  );
}

function Pitch({ xi }: { xi: (TableLine | null)[] }) {
  const box = (left: number, top: number, w: number, h: number) => (
    <div style={{ position: "absolute", left: `${left}%`, top: `${top}%`, width: `${w}%`, height: `${h}%`, border: "2px solid #9AA6C8" }} />
  );
  return (
    <div
      style={{
        display: "flex",
        position: "relative",
        margin: `18px ${PAD}px 0`,
        width: PITCH_W + 6,
        height: PITCH_H,
        border: `3px solid ${C.navy}`,
        background: C.mist,
        overflow: "hidden",
      }}
    >
      {[0, 25, 50, 75].map((y) => (
        <div key={y} style={{ position: "absolute", left: 0, top: `${y}%`, width: "100%", height: "12.5%", background: C.track, opacity: 0.45 }} />
      ))}
      {box(25, 79, 50, 22)}
      {box(39, 92, 22, 9)}
      {xi.map((r, i) => {
        const [x, y] = SPOTS[i];
        return (
          <div
            key={r?.userId ?? `empty-${i}`}
            style={{ position: "absolute", left: (x / 100) * PITCH_W - SHIRT / 2, top: (y / 100) * PITCH_H, width: SHIRT, display: "flex", flexDirection: "column", alignItems: "center" }}
          >
            {r ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <Shirt src={shirtSvg(kitOf(r.club))} size={SHIRT} big={String(i + 1)} plate={shirtName(r.name)} kit={kitOf(r.club)} />
                <div style={{ display: "flex", ...display, marginTop: 2, background: "#FFFFFF", border: `2px solid ${C.navy}`, padding: "0 8px", fontSize: 24, lineHeight: 1.1 }}>
                  {String(r.points)}
                </div>
              </div>
            ) : (
              <Shirt src={emptyShirtSvg()} size={SHIRT} big={String(i + 1)} kit={EMPTY_KIT} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function Ticket({ host }: { host: string }) {
  return (
    <div style={{ display: "flex", margin: `auto ${PAD + 8}px 40px ${PAD}px`, border: `4px solid ${C.navy}`, boxShadow: `8px 8px 0 ${C.navy}` }}>
      <div style={{ display: "flex", flexGrow: 1, ...display, background: C.tealLight, padding: "16px 22px", fontSize: 40, lineHeight: 1 }}>
        Think you know ball? Make the XI.
      </div>
      <div
        style={{ display: "flex", alignItems: "center", ...display, background: C.navy, color: "#FFFFFF", padding: "16px 22px", fontSize: 30, borderLeft: `4px dashed ${C.tealLight}` }}
      >
        {host}
      </div>
    </div>
  );
}
