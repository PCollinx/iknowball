import { useId } from "react";

// A code-drawn shirt back: the app's player card. Never a face or a crest.

export type KitPattern = "plain" | "stripes" | "sleeves" | "band";

/** A club's colours and pattern, for shirts that aren't Daily answers (profile, club picker). */
export type Kit = { shirt: string; number: string; trim?: string | null; pattern?: KitPattern };

const SHIRT = "M31 6 L43 2 Q50 9 57 2 L69 6 L97 24 L86 43 L76 37 L76 100 L24 100 L24 37 L14 43 L3 24 Z";

type Props = {
  name?: string;
  num?: string | number;
  state?: "hit" | "empty" | "miss";
  kit?: Kit;
  lettering?: Lettering;
  className?: string;
  pop?: boolean;
};

const FILL = { hit: "var(--color-royal)", empty: "var(--color-mist)", miss: "#ffffff" };
const STROKE = { hit: "var(--color-royal)", empty: "var(--color-track)", miss: "var(--color-red-card)" };
const NUMBER = { hit: "var(--color-teal-light)", empty: "var(--color-track)", miss: "var(--color-red-card)" };

export function ShirtBack({ name = "", num = "", state = "hit", kit, lettering = "arc", className = "", pop = false }: Props) {
  if (kit) return <KitShirt kit={kit} name={name} num={num} className={className} lettering={lettering} />;
  const nameSize = name.length > 9 ? 9 : 11;
  const numberFill = NUMBER[state];
  const nameFill = state === "hit" ? "#ffffff" : "var(--color-navy)";
  return (
    <svg
      viewBox="0 0 100 104"
      role="img"
      aria-label={name || (state === "empty" ? "Empty slot" : String(num))}
      className={`block h-auto w-full ${pop ? "animate-shirt-pop" : ""} ${className}`}
    >
      <path
        d={SHIRT}
        fill={FILL[state]}
        stroke={STROKE[state]}
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeDasharray={state === "empty" ? "4 3" : undefined}
      />
      {name && (
        <text
          x="50"
          y="36"
          textAnchor="middle"
          className="font-display"
          fontWeight="900"
          fontSize={nameSize}
          fill={nameFill}
          textLength={Math.min(46, name.length * nameSize * 0.52)}
          lengthAdjust="spacingAndGlyphs"
        >
          {name.toUpperCase()}
        </text>
      )}
      <text
        x="50"
        y={name ? 84 : 76}
        textAnchor="middle"
        className="font-display"
        fontWeight="900"
        fontSize={name ? 44 : 38}
        fill={numberFill}
      >
        {num}
      </text>
    </svg>
  );
}

/** How a club shirt is lettered (options under review). */
export type Lettering = "arc" | "panel" | "plate" | "none";

/** A club shirt: its pattern, collar, cuffs and hem, with lettering on top.
 * Flat colour and a navy outline, like a printed programme. */
function KitShirt({ kit, name, num, className, lettering }: { kit: Kit; name: string; num: string | number; className: string; lettering: Lettering }) {
  const clip = useId();
  const arc = useId();
  const trim = kit.trim ?? kit.number;
  const pattern = kit.pattern ?? "plain";
  // Cuffs and collar stand out from the sleeves they sit on.
  const cuff = pattern === "sleeves" ? kit.shirt : trim;
  const busy = pattern === "stripes" || pattern === "band";
  const numText = String(num);
  const type = { className: "font-display", fontWeight: 900, textAnchor: "middle" as const };
  // Sized from the text's natural width, never squeezed.
  const fit = (text: string, width: number, max: number) => Math.min(max, width / Math.max(1, text.length * 0.5));

  return (
    <svg viewBox="0 0 100 104" role="img" aria-label={[name, numText].filter(Boolean).join(", ")} className={`block h-auto w-full ${className}`}>
      <defs>
        <clipPath id={clip}>
          <path d={SHIRT} />
        </clipPath>
        <path id={arc} d="M26 33 Q50 21 74 33" fill="none" />
      </defs>
      <g clipPath={`url(#${clip})`}>
        <rect width="100" height="104" fill={kit.shirt} />
        {pattern === "stripes" &&
          [26, 38, 50, 62, 74].map((x) => <rect key={x} x={x - 3} y="0" width="6" height="104" fill={trim} />)}
        {pattern === "sleeves" && <path d="M0 0 L33 0 L24.5 38 L0 52 Z M100 0 L67 0 L75.5 38 L100 52 Z" fill={trim} />}
        {pattern === "band" && (
          <>
            <rect x="38" y="0" width="24" height="104" fill={kit.number} />
            <rect x="40.5" y="0" width="19" height="104" fill={trim} />
          </>
        )}
        {/* Shade the far side and under the sleeves: flat, no gradient. */}
        <path d="M68 0 L100 0 L100 104 L68 104 Z" fill="#0c1330" opacity="0.08" />
        <path d="M24 37 L24 46 L14 43 Z M76 37 L76 46 L86 43 Z" fill="#0c1330" opacity="0.12" />
        <path d="M3 24 L14 43 M97 24 L86 43" stroke={cuff} strokeWidth="8" />
        <path d="M43 2 Q50 9 57 2" stroke={trim} strokeWidth="6" fill="none" />
        <path d="M24 100 L76 100" stroke={trim} strokeWidth="5" />
      </g>
      <path d={SHIRT} fill="none" stroke="var(--color-navy)" strokeWidth="2" strokeLinejoin="round" />

      {/* A: name arched over the shoulders, big number below. On stripes the
          print sits on a block of shirt colour, like a real number backing. */}
      {lettering === "arc" && (
        <>
          {busy && (name || numText) && <rect x="30" y="20" width="40" height="66" fill={kit.shirt} />}
          {name && (
            <text {...type} fontSize={fit(name, 40, 10)} fill={kit.number}>
              <textPath href={`#${arc}`} startOffset="50%">
                {name.toUpperCase()}
              </textPath>
            </text>
          )}
          {numText && (
            <>
              <text {...type} x="50" y="80" fontSize={fit(numText, 36, 40)} fill={kit.number}>
                {numText.toUpperCase()}
              </text>
            </>
          )}
        </>
      )}

      {/* B: one solid panel carries the print, whatever the pattern. */}
      {lettering === "panel" && (name || numText) && (
        <>
          <rect x="30" y="30" width="40" height={name && numText ? 46 : 30} fill="#ffffff" stroke="var(--color-navy)" strokeWidth="1.5" />
          {name && (
            <text {...type} x="50" y="42" fontSize={fit(name, 36, 10)} fill="var(--color-navy)">
              {name.toUpperCase()}
            </text>
          )}
          {numText && (
            <text {...type} x="50" y={name ? 68 : 54} fontSize={fit(numText, 36, name ? 28 : 24)} fill={kit.shirt === "#FFFFFF" ? trim : kit.shirt}>
              {numText.toUpperCase()}
            </text>
          )}
        </>
      )}

      {/* C: the shirt stays clean; a nameplate hangs on the hem like a kit tag. */}
      {lettering === "plate" && (name || numText) && (
        <>
          <rect x="18" y="74" width="64" height="24" fill="var(--color-navy)" />
          {name && (
            <text {...type} x="50" y="85" fontSize={fit(name, 58, 10)} fill="#ffffff">
              {name.toUpperCase()}
            </text>
          )}
          {numText && (
            <text {...type} x="50" y={name ? 95 : 90} fontSize={name ? 7 : 12} fill="var(--color-teal-light)" letterSpacing="0.8">
              {numText.toUpperCase()}
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
