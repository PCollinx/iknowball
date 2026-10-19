import type { CSSProperties } from "react";
import type { Kit } from "@/components/daily/ShirtBack";
import { C, DISPLAY } from "./fonts";

// Text is sized from its natural width, never squeezed (as in ShirtBack).
const fit = (text: string, w: number, max: number) => Math.min(max, w / Math.max(1, text.length * 0.5));

/** One kit shirt for next/og, with its number (and nameplate, when given) set
 * in real type over the drawing, at the places ShirtBack sets them in its
 * 100 x 104 units. `src` is shirtSvg(kit). */
export function Shirt({ src, size, big, plate, kit, style }: { src: string; size: number; big: string; plate?: string; kit: Kit; style?: CSSProperties }) {
  const u = size / 100;
  const h = Math.round(size * 1.04);
  const busy = Boolean(kit.half) || ["stripes", "bars", "pinstripes", "band"].includes(kit.pattern ?? "plain");
  // Without a nameplate the number sits lower and runs bigger.
  const numSize = fit(big, 36, plate === undefined ? 44 : 38) * u;
  const edge = Math.max(1, 2.4 * u);
  return (
    <div style={{ display: "flex", position: "relative", width: size, height: h, ...style }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- Satori draws <img>, not next/image */}
      <img src={src} width={size} height={h} style={{ position: "absolute", left: 0, top: 0 }} alt="" />
      <div
        style={{
          position: "absolute",
          left: 0,
          width: size,
          top: (plate === undefined ? 38 : 30) * u,
          height: (plate === undefined ? 40 : 34) * u,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: DISPLAY,
          fontSize: numSize,
          lineHeight: 1,
          color: kit.half ? "#FFFFFF" : kit.number,
          // On stripes or halves the number gets a navy edge so it reads on both colours.
          ...(busy ? { WebkitTextStroke: `${edge}px ${C.navy}` } : {}),
        }}
      >
        {big}
      </div>
      {plate !== undefined && (
        <div
          style={{
            position: "absolute",
            left: 18 * u,
            top: 74 * u,
            width: 64 * u,
            height: 24 * u,
            background: C.navy,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: DISPLAY,
            fontSize: fit(plate, 58, 12) * u * (plate === "?" ? 1.4 : 1),
            lineHeight: 1,
            color: plate === "?" ? C.tealLight : "#FFFFFF",
            textTransform: "uppercase",
          }}
        >
          {plate}
        </div>
      )}
    </div>
  );
}
