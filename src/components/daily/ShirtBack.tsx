// A code-drawn shirt back: the app's player card. Never a face or a crest.
type Props = {
  name?: string;
  num?: string | number;
  state?: "hit" | "empty" | "miss";
  className?: string;
  pop?: boolean;
};

const FILL = { hit: "var(--color-royal)", empty: "var(--color-mist)", miss: "#ffffff" };
const STROKE = { hit: "var(--color-royal)", empty: "var(--color-track)", miss: "var(--color-red-card)" };
const NUMBER = { hit: "var(--color-teal-light)", empty: "var(--color-track)", miss: "var(--color-red-card)" };

export function ShirtBack({ name = "", num = "", state = "hit", className = "", pop = false }: Props) {
  const nameSize = name.length > 9 ? 9 : 11;
  return (
    <svg
      viewBox="0 0 100 104"
      role="img"
      aria-label={name || (state === "empty" ? "Empty slot" : String(num))}
      className={`block h-auto w-full ${pop ? "animate-shirt-pop" : ""} ${className}`}
    >
      <path
        d="M31 6 L43 2 Q50 9 57 2 L69 6 L97 24 L86 43 L76 37 L76 100 L24 100 L24 37 L14 43 L3 24 Z"
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
          fill={state === "hit" ? "#ffffff" : "var(--color-navy)"}
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
        fill={NUMBER[state]}
      >
        {num}
      </text>
    </svg>
  );
}

/** The name printed on a shirt: the surname, or the whole name for one-name players. */
export function shirtName(text: string): string {
  return text.split(" ").pop() ?? text;
}
