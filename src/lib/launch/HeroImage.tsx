import type { Kit } from "@/components/daily/ShirtBack";
import { BODY, C, DISPLAY } from "@/lib/og/fonts";
import { LOGO_RATIO, LOGO_SRC } from "@/lib/og/logo";
import { Shirt } from "@/lib/og/Shirt";
import { shirtSvg } from "@/lib/og/shirt-svg";

// The top of the launch email as one PNG (mock D): the masthead over a double
// rule, "The gates are open." and their shirt in their club's kit with their
// number on the back and their name on the nameplate. Drawn by next/og: every
// text node is one string and every box with children is a flex box.

export const HERO_W = 1200;
export const HERO_H = 640;

export type Hero = { name: string | null; position: number; kit: Kit; when: string };

const label = { fontFamily: BODY, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" } as const;

export function HeroImage({ h }: { h: Hero }) {
  return (
    <div style={{ width: HERO_W, height: HERO_H, display: "flex", flexDirection: "column", background: "#FFFFFF", color: C.navy, fontFamily: BODY }}>
      <div style={{ display: "flex", flexDirection: "column", padding: "36px 56px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- Satori draws <img>, not next/image */}
            <img src={LOGO_SRC} width={Math.round(66 * LOGO_RATIO)} height={66} alt="" />
            <div style={{ display: "flex", fontFamily: DISPLAY, fontSize: 54, marginLeft: 14 }}>
              <span>iKnow</span>
              <span style={{ color: C.teal }}>Ball</span>
            </div>
          </div>
          <span style={{ ...label, fontSize: 24 }}>{`${h.when} · Kick-off`}</span>
        </div>
        <div style={{ display: "flex", height: 10, borderTop: `3px solid ${C.navy}`, borderBottom: `3px solid ${C.navy}` }} />
      </div>
      <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "space-between", padding: "0 56px" }}>
        <div style={{ display: "flex", flexDirection: "column", fontFamily: DISPLAY, fontSize: 168, lineHeight: 0.84, textTransform: "uppercase" }}>
          <span>The gates</span>
          <span>are open.</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", background: C.mist, padding: "26px 30px 22px", transform: "rotate(3deg)" }}>
          <Shirt src={shirtSvg(h.kit)} size={290} big={String(h.position)} plate={h.name ?? "Your shirt"} kit={h.kit} />
          <span style={{ ...label, fontSize: 22, marginTop: 10 }}>{`No. ${h.position} on the sheet`}</span>
        </div>
      </div>
    </div>
  );
}
