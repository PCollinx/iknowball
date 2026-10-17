// A code-drawn shirt back: the app's player card. Never a face or a crest.
/** A club's colours, for shirts that aren't Daily answers (profile, club picker). */
export type Kit = { shirt: string; number: string; trim?: string | null };

type Props = {
  name?: string;
  num?: string | number;
  state?: "hit" | "empty" | "miss";
  kit?: Kit;
  className?: string;
  pop?: boolean;
};

const FILL = { hit: "var(--color-royal)", empty: "var(--color-mist)", miss: "#ffffff" };
const STROKE = { hit: "var(--color-royal)", empty: "var(--color-track)", miss: "var(--color-red-card)" };
const NUMBER = { hit: "var(--color-teal-light)", empty: "var(--color-track)", miss: "var(--color-red-card)" };

export function ShirtBack({ name = "", num = "", state = "hit", kit, className = "", pop = false }: Props) {
  const nameSize = name.length > 9 ? 9 : 11;
  const fill = kit?.shirt ?? FILL[state];
  const stroke = kit ? kit.trim ?? kit.number : STROKE[state];
  const numberFill = kit?.number ?? NUMBER[state];
  const nameFill = kit?.number ?? (state === "hit" ? "#ffffff" : "var(--color-navy)");
  // Words in the number's place (a tier, a club code) are fitted to the shirt.
  const numText = String(num);
  const wide = numText.length > 1 && !/^\d+$/.test(numText);
  return (
    <svg
      viewBox="0 0 100 104"
      role="img"
      aria-label={name || (state === "empty" ? "Empty slot" : String(num))}
      className={`block h-auto w-full ${pop ? "animate-shirt-pop" : ""} ${className}`}
    >
      <path
        d="M31 6 L43 2 Q50 9 57 2 L69 6 L97 24 L86 43 L76 37 L76 100 L24 100 L24 37 L14 43 L3 24 Z"
        fill={fill}
        stroke={stroke}
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
      {wide ? (
        <WordNumber words={numText.toUpperCase().split(" ")} fill={numberFill} />
      ) : (
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
      )}
    </svg>
  );
}

/** One or two words where the number goes, as big as the longest word allows. */
function WordNumber({ words, fill }: { words: string[]; fill: string }) {
  const longest = Math.max(...words.map((w) => w.length));
  const size = Math.min(30, 50 / (longest * 0.45));
  const top = 76 - ((words.length - 1) * size) / 2;
  return (
    <text textAnchor="middle" className="font-display" fontWeight="900" fontSize={size} fill={fill}>
      {words.map((w, i) => (
        <tspan key={i} x="50" y={top + i * size} textLength={Math.min(50, w.length * size * 0.45)} lengthAdjust="spacingAndGlyphs">
          {w}
        </tspan>
      ))}
    </text>
  );
}

/** The name printed on a shirt: the surname, or the whole name for one-name players. */
export function shirtName(text: string): string {
  return text.split(" ").pop() ?? text;
}
