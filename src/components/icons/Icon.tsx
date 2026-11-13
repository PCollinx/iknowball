// Drawn icons for the arrows, ticks and marks the app used to print as
// characters (Collins, 13 Nov 2026): iOS shows some of them as emoji (↗ was a
// blue tile), and fonts draw the rest unevenly. Each is sized in em, so it sits
// in its line of text and takes the text's colour.

type Props = { className?: string };

const LINE = { fill: "none", stroke: "currentColor", strokeWidth: 2.75, strokeLinecap: "square", strokeLinejoin: "miter" } as const;

function Svg({ className = "", size = "size-[0.8em]", children }: Props & { size?: string; children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false" className={`inline-block shrink-0 align-[-0.08em] ${size} ${className}`}>
      {children}
    </svg>
  );
}

const ROTATE = { right: "", left: "rotate-180", up: "-rotate-90", down: "rotate-90" } as const;

/** → by default; `dir` turns it. */
export function Arrow({ dir = "right", className = "" }: Props & { dir?: keyof typeof ROTATE }) {
  return (
    <Svg className={`${ROTATE[dir]} ${className}`}>
      <path {...LINE} d="M2.5 8h10.5M9 3.75 13.25 8 9 12.25" />
    </Svg>
  );
}

/** ↗, for a link that opens somewhere else. */
export function ArrowUpRight({ className = "" }: Props) {
  return (
    <Svg className={className}>
      <path {...LINE} d="M4 12 12 4M5.5 4H12v6.5" />
    </Svg>
  );
}

/** ✓ */
export function Check({ className = "" }: Props) {
  return (
    <Svg className={className}>
      <path {...LINE} strokeWidth={3} d="M2.75 8.5 6.25 12l7-8" />
    </Svg>
  );
}

/** ✕ */
export function Cross({ className = "" }: Props) {
  return (
    <Svg className={className}>
      <path {...LINE} strokeWidth={3} d="M4 4l8 8M12 4l-8 8" />
    </Svg>
  );
}

/** ▲ or ▼, for places moved. */
export function Triangle({ dir = "up", className = "" }: Props & { dir?: "up" | "down" }) {
  return (
    <Svg size="size-[0.7em]" className={`${dir === "down" ? "rotate-180" : ""} ${className}`}>
      <path fill="currentColor" d="M8 2.5 14.5 13.5h-13z" />
    </Svg>
  );
}

/** ▾, for something that opens. */
export function Chevron({ className = "" }: Props) {
  return (
    <Svg className={className}>
      <path {...LINE} d="M3.5 6 8 10.5 12.5 6" />
    </Svg>
  );
}

/** ● (on) or ○ (off). */
export function Dot({ on = true, className = "" }: Props & { on?: boolean }) {
  return (
    <Svg size="size-[0.6em]" className={className}>
      <circle cx="8" cy="8" r={on ? 6 : 5} fill={on ? "currentColor" : "none"} stroke="currentColor" strokeWidth={on ? 0 : 2} />
    </Svg>
  );
}
