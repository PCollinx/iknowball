import { resultStats, type ResultCardData } from "@/components/clash/result";
import { BODY, C, DISPLAY } from "@/lib/og/fonts";
import { FOOTBALL_SRC, MISS_SRC } from "@/lib/og/football";
import { formatRating, ratingColours } from "@/lib/profile/rating";

// Clash full time as a 1080 x 1080 image, drawn by next/og: the same score,
// stamp, rating tag, shootout row and stats as the screen, under the
// iKnowBall masthead and over the challenge link. Every text node is one
// string and no style is undefined: Satori fails on both.

export const RESULT_SIZE = 1080;
const u = RESULT_SIZE / 100;
const label = { fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase" } as const;

export function ResultImage({ d }: { d: ResultCardData }) {
  const rate = ratingColours(d.rating);
  const missed = d.kicks.length - d.right;
  // Smaller balls for a long sprint, so up to 40 kicks fit in three rows.
  const ball = (d.kicks.length > 26 ? 4.3 : 5.6) * u;
  return (
    <div style={{ width: RESULT_SIZE, height: RESULT_SIZE, display: "flex", flexDirection: "column", background: "#FFFFFF", border: `2px solid ${C.navy}`, color: C.navy, fontFamily: BODY }}>
      <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, padding: `${4.5 * u}px ${5 * u}px 0` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", borderBottom: `${0.35 * u}px solid ${C.navy}`, paddingBottom: 1.6 * u }}>
          <div style={{ display: "flex", fontFamily: DISPLAY, fontSize: 7 * u, lineHeight: 0.9 }}>
            <span style={{ color: C.royal }}>i</span>
            <span>KNOWBALL</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", fontSize: 2.4 * u, lineHeight: 1.35, ...label }}>
            <span>{`Clash · Full time · ${d.code}`}</span>
            <span>{d.dateLabel}</span>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 2.4 * u }}>
          <span style={{ fontSize: 2.6 * u, ...label }}>{`${d.statLabel} · 60 seconds`}</span>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 8.4 * u,
              height: 8.4 * u,
              borderRadius: 8.4 * u,
              border: `${0.5 * u}px solid ${C.navy}`,
              background: rate.fill,
              color: rate.text,
              fontFamily: DISPLAY,
              fontSize: 4 * u,
              lineHeight: 1,
            }}
          >
            {formatRating(d.rating)}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", paddingBottom: 2.4 * u }}>
          <div style={{ display: "flex", alignItems: "baseline", fontFamily: DISPLAY, lineHeight: 0.78 }}>
            <span style={{ fontSize: 30 * u, color: C.royal }}>{String(d.right)}</span>
            <span style={{ fontSize: 8.5 * u, marginLeft: 1.5 * u }}>RIGHT</span>
          </div>
          <div
            style={{
              display: "flex",
              marginBottom: 2.4 * u,
              marginRight: 1 * u,
              transform: "rotate(-3deg)",
              border: `${1 * u}px solid ${C.red}`,
              color: C.red,
              fontFamily: DISPLAY,
              fontSize: 6.4 * u,
              lineHeight: 1,
              padding: `${0.8 * u}px ${2.2 * u}px ${1.2 * u}px`,
            }}
          >
            {missed === 0 ? "CLEAN SHEET" : `${missed} MISSED`}
          </div>
        </div>
        <div style={{ display: "flex", height: 0.3 * u, background: C.navy }} />
        <div style={{ display: "flex", height: 0.3 * u, background: C.navy, marginTop: 0.4 * u }} />

        <div style={{ display: "flex", flexWrap: "wrap", alignContent: "center", flexGrow: 1, padding: `${1.8 * u}px 0 ${0.8 * u}px` }}>
          {[...d.kicks].map((k, i) => (
            // eslint-disable-next-line @next/next/no-img-element -- Satori draws <img>, not next/image
            <img key={i} src={k === "1" ? FOOTBALL_SRC : MISS_SRC} width={ball} height={ball} style={{ marginRight: 0.2 * ball, marginBottom: 0.2 * ball }} alt="" />
          ))}
        </div>

        <div style={{ display: "flex", borderTop: `${0.5 * u}px solid ${C.navy}` }}>
          {resultStats(d).map((s, i) => (
            <div
              key={s.key}
              style={{
                display: "flex",
                flexDirection: "column",
                flex: 1,
                padding: `${2 * u}px 0 ${2.6 * u}px ${i ? 3 * u : 0}px`,
                ...(i ? { borderLeft: `${0.3 * u}px solid ${C.track}` } : {}),
              }}
            >
              <span style={{ fontFamily: DISPLAY, fontSize: 9 * u, lineHeight: 0.9 }}>{s.value}</span>
              <span style={{ fontSize: 2.4 * u, lineHeight: 1.4, ...label, color: "rgba(12,19,48,0.7)" }}>{s.key}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: C.teal, color: "#FFFFFF", padding: `${2.6 * u}px ${5 * u}px ${2.8 * u}px` }}>
        <div style={{ display: "flex", flexDirection: "column", fontFamily: DISPLAY, fontSize: 5.6 * u, lineHeight: 0.9 }}>
          <span>THINK YOU KNOW BALL?</span>
          <span>{`BEAT ${d.right}.`}</span>
        </div>
        <span style={{ fontSize: 2.2 * u, fontWeight: 600, letterSpacing: "0.08em" }}>{d.link.toUpperCase()}</span>
      </div>
    </div>
  );
}
