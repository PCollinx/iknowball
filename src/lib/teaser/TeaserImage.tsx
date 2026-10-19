import type { Kit } from "@/components/daily/ShirtBack";
import { FORMATS, fitSize, linesAt, shirtGrid, shirtLabels, type Teaser } from "./layout";
import { BODY, C, DISPLAY } from "@/lib/og/fonts";
import { Shirt } from "@/lib/og/Shirt";
import { shirtSvg } from "@/lib/og/shirt-svg";

// A teaser quiz for X, drawn by next/og (Satori: flexbox and inline styles
// only). It's the Daily's matchday programme without the app's name: the name
// is revealed on 1 Nov. Shirts are the Daily's kit shirts, half and half in
// the two clubs, with the nameplate on the hem.

type Box = { pad: number; mastGap: number; foot: number; gap: number };
const BOX: Record<Teaser["format"], Box> = {
  wide: { pad: 64, mastGap: 36, foot: 132, gap: 22 },
  tall: { pad: 56, mastGap: 30, foot: 150, gap: 18 },
};

export function TeaserImage({ t, kit }: { t: Teaser; kit: Kit }) {
  const { width, height } = FORMATS[t.format];
  const b = BOX[t.format];
  const wide = t.format === "wide";
  const inner = width - b.pad * 2;
  const mastH = 30 + 14; // label line plus the double rule
  const bodyH = height - b.pad - mastH - b.mastGap - b.foot - b.pad / 2;

  // Wide: words left, shirts right. Tall: words on top, shirts below.
  const textW = wide ? Math.round(inner * 0.5) : inner;
  const headline = t.headline || "Name them";
  const headSize = fitSize(headline, textW, wide ? 150 : 140, 64, wide ? 3 : 2);
  const headLines = linesAt(headline, headSize, textW);
  const qSize = 34;
  const tab = t.kind === "recall" && !t.names.length ? `${t.count} to name` : t.kind === "order" ? "Order of joining" : "The answers";

  const wordsH = headSize * 0.92 * headLines + 28 + (t.question ? qSize * 1.25 * 2 + 12 : 0) + 64;
  const shirtsBox = wide ? { w: inner - textW - 56, h: bodyH } : { w: inner, h: bodyH - wordsH - 24 };
  const grid = shirtGrid(t.count, shirtsBox.w, shirtsBox.h, b.gap);
  const shirt = shirtSvg(kit);
  const labels = shirtLabels(t);
  const rows = Array.from({ length: Math.ceil(t.count / grid.cols) }, (_, r) => labels.slice(r * grid.cols, r * grid.cols + grid.cols));

  return (
    <div style={{ width, height, display: "flex", flexDirection: "column", background: "#FFFFFF", color: C.navy, fontFamily: BODY }}>
      <div style={{ display: "flex", flexDirection: "column", padding: `${b.pad}px ${b.pad}px ${b.pad / 2}px`, flexGrow: 1 }}>
        {/* Masthead: a programme's issue line over a double rule. */}
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 22, fontWeight: 600, letterSpacing: 3, textTransform: "uppercase" }}>
          <span>Matchday quiz · No. {String(t.no).padStart(2, "0")}</span>
          <span>{t.when}</span>
        </div>
        <div style={{ display: "flex", height: 4, background: C.navy, marginTop: 10 }} />
        <div style={{ display: "flex", height: 1.5, background: C.navy, marginTop: 4 }} />

        <div style={{ display: "flex", flexDirection: wide ? "row" : "column", marginTop: b.mastGap, justifyContent: "space-between", flexGrow: 1 }}>
          <div style={{ display: "flex", flexDirection: "column", width: textW }}>
            <div
              style={{
                display: "flex",
                fontFamily: DISPLAY,
                fontSize: headSize,
                lineHeight: 0.92,
                textTransform: "uppercase",
                color: C.navy,
              }}
            >
              {headline}
            </div>
            {t.question && <div style={{ display: "flex", fontSize: qSize, fontWeight: 600, lineHeight: 1.25, marginTop: 24 }}>{t.question}</div>}
            {/* The countdown tab of the Daily's scoreboard, here a tally. */}
            <div style={{ display: "flex", marginTop: 28 }}>
              <span
                style={{
                  display: "flex",
                  background: C.teal,
                  color: "#FFFFFF",
                  fontFamily: DISPLAY,
                  fontSize: 40,
                  textTransform: "uppercase",
                  padding: "6px 18px 4px",
                  letterSpacing: 1,
                }}
              >
                {tab}
              </span>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: wide ? "flex-end" : "center",
              marginTop: wide ? 0 : 24,
              width: shirtsBox.w,
              flexGrow: 1,
            }}
          >
            {/* Short last rows sit centred under the full ones. */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              {rows.map((row, r) => (
                <div key={r} style={{ display: "flex", marginTop: r ? b.gap : 0 }}>
                  {row.map((l, i) => (
                    <Shirt key={i} src={shirt} size={grid.shirt} big={l.big} plate={l.plate} kit={kit} style={{ marginLeft: i ? b.gap : 0 }} />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* The dare, on the share card's teal band. */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: b.foot,
          background: C.teal,
          padding: `0 ${b.pad}px`,
        }}
      >
        <span style={{ display: "flex", fontFamily: DISPLAY, fontSize: wide ? 58 : 52, color: "#FFFFFF", textTransform: "uppercase", lineHeight: 1 }}>
          {t.dare || "Think you know ball?"}
        </span>
        {t.aside && (
          <span style={{ display: "flex", fontSize: 24, fontWeight: 600, letterSpacing: 3, textTransform: "uppercase", color: C.navy }}>{t.aside}</span>
        )}
      </div>
    </div>
  );
}
