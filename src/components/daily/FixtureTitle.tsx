import type { CSSProperties } from "react";
import { splitFixture } from "./fixture";

// Big Shoulders 900 capitals run about 0.56em wide; a little spare so the
// longest word never touches the edge.
const CAP_WIDTH = 0.6;

/** The longest word, in em, so a heading can be sized to fit it. */
export function fitWidth(title: string): number {
  const longest = Math.max(...title.split(/\s+/).map((w) => w.length), 1);
  return longest * CAP_WIDTH;
}

/** The whole title on one line, in em. */
export function lineWidth(title: string): number {
  return title.length * CAP_WIDTH;
}

type Props = {
  title: string;
  /** Tailwind font-size classes using var(--fit), e.g. "text-[min(64px,var(--fit))]". */
  className: string;
  as?: "h1" | "h2" | "div";
};

/** "Home v Away" with a royal v, sized so the longest club name fits its column.
 * The parent must be an @container. Never squeezed: it gets smaller instead. */
export function FixtureTitle({ title, className, as: Tag = "h1" }: Props) {
  const [home, away] = splitFixture(title);
  const style = { "--fit": `calc(100cqw / ${fitWidth(title)})` } as CSSProperties;
  return (
    <Tag className={`font-display leading-[0.9] uppercase ${className}`} style={style}>
      {home}
      {away && (
        <>
          {" "}
          <span className="text-royal">v</span> {away}
        </>
      )}
    </Tag>
  );
}
