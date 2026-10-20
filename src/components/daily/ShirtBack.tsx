import { useId } from "react";

// A code-drawn shirt back: the app's player card. Never a face or a crest.
// Club shirts are drawn as kits (pattern, collar, cuffs, hem) in flat colour
// with a navy outline, like a printed programme; the lettering is the
// "nameplate" picked on 18 Oct 2026: a navy tag on the hem carries the name.

export type KitPattern = "plain" | "stripes" | "bars" | "pinstripes" | "sleeves" | "band" | "hoop" | "sides" | "yoke";
export type KitCollar = "crew" | "polo";

/** A club's colours, pattern and collar. `half` makes a half-and-half shirt, as
 * on a matchday scarf: the Daily's answers wear both clubs of the fixture. */
export type Kit = { shirt: string; number: string; trim?: string | null; pattern?: KitPattern; collar?: KitCollar; half?: Kit };

/** "number": big number on the shirt, name on the tag (Daily answers).
 * "tag": clean shirt, name and a second line on the tag (profile, picker). */
export type Lettering = "number" | "tag";

export const SHIRT = "M31 6 L43 2 Q50 9 57 2 L69 6 L97 24 L86 43 L76 37 L76 100 L24 100 L24 37 L14 43 L3 24 Z";

/** The app's own kit, for Daily answers when the fixture's clubs aren't known. */
export const ROYAL_KIT: Kit = { shirt: "#2440FF", number: "#FFFFFF", trim: "#7FE3E0" };
const MISS_KIT: Kit = { shirt: "#FFFFFF", number: "#D7263D", trim: "#D7263D" };

type Props = {
  name?: string;
  num?: string | number;
  state?: "hit" | "empty" | "miss";
  kit?: Kit;
  lettering?: Lettering;
  /** The tag's second line, under the name. */
  tag?: string;
  className?: string;
  pop?: boolean;
};

export function ShirtBack({ name = "", num = "", state = "hit", kit, lettering = "number", tag = "", className = "", pop = false }: Props) {
  if (state === "empty") return <EmptyShirt num={num} className={className} />;
  return (
    <KitShirt
      kit={state === "miss" ? MISS_KIT : (kit ?? ROYAL_KIT)}
      name={name}
      num={num}
      tag={tag}
      lettering={lettering}
      className={`${pop ? "animate-shirt-pop" : ""} ${className}`}
    />
  );
}

/** A slot still to fill: a dashed outline. */
function EmptyShirt({ num, className }: { num: string | number; className: string }) {
  return (
    <svg viewBox="0 0 100 104" role="img" aria-label="Empty slot" className={`block h-auto w-full ${className}`}>
      <path d={SHIRT} fill="var(--color-mist)" stroke="var(--color-track)" strokeWidth="2.5" strokeLinejoin="round" strokeDasharray="4 3" />
      <text x="50" y="76" textAnchor="middle" className="font-display" fontWeight="900" fontSize="38" fill="var(--color-track)">
        {num}
      </text>
    </svg>
  );
}

/** The shirt's body: base colour and pattern, shading, cuffs and collar. */
export function Fabric({ kit, side }: { kit: Kit; side: "both" | "left" | "right" }) {
  const trim = kit.trim ?? kit.number;
  const pattern = kit.pattern ?? "plain";
  // Cuffs stand out from the sleeves they sit on.
  const cuff = pattern === "sleeves" ? kit.shirt : trim;
  const left = side !== "right";
  const right = side !== "left";
  return (
    <>
      <rect width="100" height="104" fill={kit.shirt} />
      {pattern === "stripes" && [26, 38, 50, 62, 74].map((x) => <rect key={x} x={x - 3} y="0" width="6" height="104" fill={trim} />)}
      {pattern === "bars" && [14, 38, 62, 86].map((x) => <rect key={x} x={x - 6} y="0" width="12" height="104" fill={trim} />)}
      {pattern === "pinstripes" && [22, 29, 36, 43, 50, 57, 64, 71, 78].map((x) => <rect key={x} x={x - 0.7} y="0" width="1.4" height="104" fill={trim} />)}
      {pattern === "hoop" && <rect x="0" y="27" width="100" height="10" fill={trim} />}
      {pattern === "sides" && <path d="M14 43 L24 34 L33 34 L33 104 L22 104 Z M86 43 L76 34 L67 34 L67 104 L78 104 Z" fill={trim} />}
      {pattern === "yoke" && <path d="M0 0 L100 0 L100 22 L62 16 Q50 19 38 16 L0 22 Z" fill={trim} />}
      {pattern === "sleeves" && <path d="M0 0 L33 0 L24.5 38 L0 52 Z M100 0 L67 0 L75.5 38 L100 52 Z" fill={trim} />}
      {pattern === "band" && (
        <>
          <rect x="38" y="0" width="24" height="104" fill={kit.number} />
          <rect x="40.5" y="0" width="19" height="104" fill={trim} />
        </>
      )}
      {left && <path d="M3 24 L14 43" stroke={cuff} strokeWidth="8" />}
      {right && <path d="M97 24 L86 43" stroke={cuff} strokeWidth="8" />}
      {kit.collar === "polo" ? (
        // A fold-down collar, lying over the shoulders.
        <path d="M32 5 L43 1 Q50 9 57 1 L68 5 L63 16 Q50 21 37 16 Z" fill={trim} stroke="#0c1330" strokeOpacity="0.35" strokeWidth="1" />
      ) : (
        <path d="M43 2 Q50 9 57 2" stroke={trim} strokeWidth="6" fill="none" />
      )}
    </>
  );
}

function KitShirt({ kit, name, num, tag, lettering, className }: { kit: Kit; name: string; num: string | number; tag: string; lettering: Lettering; className: string }) {
  const clip = useId();
  const halfClip = useId();
  const numText = String(num);
  const busy = Boolean(kit.half) || ["stripes", "bars", "pinstripes", "band"].includes(kit.pattern ?? "plain");
  const type = { className: "font-display", fontWeight: 900, textAnchor: "middle" as const };
  // Sized from the text's natural width, never squeezed.
  const fit = (text: string, width: number, max: number) => Math.min(max, width / Math.max(1, text.length * 0.5));
  const line = lettering === "tag" ? numText : tag;
  const plate = Boolean(name || line);
  const big = lettering === "number" && numText;

  return (
    <svg viewBox="0 0 100 104" role="img" aria-label={[name, numText, tag].filter(Boolean).join(", ")} className={`block h-auto w-full ${className}`}>
      <defs>
        <clipPath id={clip}>
          <path d={SHIRT} />
        </clipPath>
        <clipPath id={halfClip}>
          <rect x="50" y="0" width="50" height="104" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clip})`}>
        <Fabric kit={kit} side={kit.half ? "left" : "both"} />
        {kit.half && (
          <g clipPath={`url(#${halfClip})`}>
            <Fabric kit={kit.half} side="right" />
          </g>
        )}
        {/* Shade the far side and under the sleeves: flat, no gradient. */}
        <path d="M68 0 L100 0 L100 104 L68 104 Z" fill="#0c1330" opacity="0.08" />
        <path d="M24 37 L24 46 L14 43 Z M76 37 L76 46 L86 43 Z" fill="#0c1330" opacity="0.12" />
        <path d="M24 100 L76 100" stroke={kit.trim ?? kit.number} strokeWidth="5" />
      </g>
      <path d={SHIRT} fill="none" stroke="var(--color-navy)" strokeWidth="2" strokeLinejoin="round" />

      {big && (
        <text
          {...type}
          x="50"
          y={plate ? 61 : 72}
          fontSize={fit(numText, 36, plate ? 38 : 44)}
          // On stripes or halves the number gets an edge so it reads on both colours.
          fill={kit.half ? "#ffffff" : kit.number}
          stroke={busy ? "var(--color-navy)" : undefined}
          strokeWidth={busy ? 3 : undefined}
          paintOrder="stroke"
          strokeLinejoin="round"
        >
          {numText.toUpperCase()}
        </text>
      )}
      {plate && (
        <>
          <rect x="18" y="74" width="64" height="24" fill="var(--color-navy)" />
          {name && (
            <text {...type} x="50" y={line ? 85 : 89.5} fontSize={fit(name, 58, line ? 10 : 12)} fill="#ffffff">
              {name.toUpperCase()}
            </text>
          )}
          {line && (
            <text {...type} x="50" y={name ? 95 : 90} fontSize={fit(line, 44, name ? 7 : 12)} fill="var(--color-teal-light)" letterSpacing="0.6">
              {line.toUpperCase()}
            </text>
          )}
        </>
      )}
    </svg>
  );
}

/** The name printed on a shirt: the surname, or the whole name for one-name players. */
export function shirtName(text: string): string {
  return text.split(" ").pop() ?? text;
}
