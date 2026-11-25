import { Fragment, type CSSProperties, type ReactNode } from "react";
import { CAP_WIDTH } from "./FixtureTitle";
import { questionLine } from "./formats";
import type { PathClub } from "./KitTrail";
import { ShirtBack } from "./ShirtBack";
import { Arrow } from "@/components/icons/Icon";

// A picks question's big line, all navy (Headings are navy).
// Clubs as kits: option C of https://claude.ai/artifact/QHbqo6Zz7e2bvrvMPXpP4S (Collins, 25 Nov 2026).
// Seasons and scorelines: option S·A on the same canvas (Collins, 25 Nov 2026):
// a match is both kits with the score between, a title the club's kit, a
// Golden Boot a navy stamp. One row at every width; kits the same size on desktop.

type Props = {
  question: string | null;
  kits: Record<string, PathClub>;
  /** The round's draft template: "golden-boot-picks" stamps a bare season "Golden Boot". */
  template?: string | null;
};

export function QuestionLine({ question, kits, template }: Props) {
  if (!question) return null;
  const line = questionLine(question);
  switch (line.kind) {
    case "at":
      return (
        <Row label={question} side={<Kits clubs={line.clubs} kits={kits} />}>
          <Fit text={line.who} />
        </Row>
      );
    case "match":
      return (
        <div role="img" aria-label={question}>
          {line.when && <span className="label block text-[10px] text-navy/70 lg:text-xs">{line.when}</span>}
          <div aria-hidden className={`grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 ${line.when ? "mt-1" : ""}`}>
            <KitTag name={line.home} kits={kits} />
            <p className="text-center font-display text-[52px] leading-[0.85] whitespace-nowrap uppercase lg:text-[64px]">{line.score}</p>
            <KitTag name={line.away} kits={kits} />
          </div>
        </div>
      );
    case "title":
      return (
        <Row label={question} side={<KitTag name={line.club} kits={kits} />}>
          <Fit text={line.what} />
        </Row>
      );
    case "award":
      return (
        <Row label={question} side={<Stamp>{line.what}</Stamp>}>
          <Fit text={line.who} />
        </Row>
      );
    case "season":
      return (
        <Row label={question} side={template === "golden-boot-picks" ? <Stamp>Golden Boot</Stamp> : null}>
          <p className="font-display text-[52px] leading-[0.85] whitespace-nowrap uppercase lg:text-[64px]">{line.season}</p>
        </Row>
      );
    default:
      return <p className="font-display text-[38px] text-balance leading-[0.9] uppercase lg:text-[65px]">{line.text}</p>;
  }
}

/** The line and what sits at its right, one row: the line's cell takes what's left. */
function Row({ label, side, children }: { label: string; side: ReactNode; children: ReactNode }) {
  return (
    <div role="img" aria-label={label} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
      <div aria-hidden className="@container min-w-0">
        {children}
      </div>
      {side && <span aria-hidden>{side}</span>}
    </div>
  );
}

/** Text on one line, as big as its cell allows, never past the cap. */
function Fit({ text }: { text: string }) {
  const fit = { "--fit": `calc(100cqw / ${Math.max(text.length, 1) * CAP_WIDTH})` } as CSSProperties;
  return (
    <p className="font-display text-[min(32px,var(--fit))] leading-[0.9] whitespace-nowrap uppercase lg:text-[min(48px,var(--fit))]" style={fit}>
      {text}
    </p>
  );
}

/** Clubs in order as kits, a teal arrow between. */
function Kits({ clubs, kits }: { clubs: string[]; kits: Record<string, PathClub> }) {
  return (
    <span className="flex items-center gap-1">
      {clubs.slice(0, 3).map((name, i) => (
        <Fragment key={`${name}-${i}`}>
          {i > 0 && (
            <span className="text-lg text-teal">
              <Arrow />
            </span>
          )}
          <KitTag name={name} kits={kits} />
        </Fragment>
      ))}
    </span>
  );
}

/** A club's shirt with its full name on a navy nameplate over the hem, never wrapped. */
function KitTag({ name, kits }: { name: string; kits: Record<string, PathClub> }) {
  return (
    <span className="grid min-w-16 justify-items-center">
      <span className="block w-14">
        <ShirtBack kit={kits[name]?.kit} />
      </span>
      <span className="-mt-3 bg-navy px-1.5 py-[3px] font-display text-[13px] leading-none whitespace-nowrap text-white uppercase">{name}</span>
    </span>
  );
}

/** A navy stamp with a light-teal shadow, for what has no kit (an award). */
function Stamp({ children }: { children: ReactNode }) {
  return (
    <span className="block bg-navy px-2 py-1.5 font-display text-[15px] leading-none whitespace-nowrap text-white uppercase shadow-[3px_3px_0_var(--color-teal-light)]">
      {children}
    </span>
  );
}
