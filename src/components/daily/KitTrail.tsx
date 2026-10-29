import { Fragment } from "react";
import { PATH_ARROW } from "./formats";
import { ShirtBack, type Kit } from "./ShirtBack";

// Career paths in kits (Collins, 29 Oct 2026, options B and D of the mocks at
// https://claude.ai/artifact/XZPeyWysVXSbECdxN3hmf5): Rapid picks shows a
// player's clubs as a trail of shirts, and In Order's full time shows each club
// as its shirt under the year he joined.

/** A club as a path shows it: its kit and its short name for the nameplate. */
export type PathClub = { kit: Kit; short: string };

/** The clubs in a Rapid picks question, or null when it isn't a path. */
export function pathOf(question: string | null): string[] | null {
  const clubs = question?.split(PATH_ARROW) ?? [];
  return clubs.length > 1 ? clubs : null;
}

/** Up to five shirts with arrows between, the day's clubs as drawn as any other. */
export function KitTrail({ clubs, kits, className = "" }: { clubs: string[]; kits: Record<string, PathClub>; className?: string }) {
  return (
    <div role="img" aria-label={clubs.join(", then ")} className={`flex items-end gap-0.5 ${className}`}>
      {clubs.slice(0, 5).map((name, i) => (
        <Fragment key={`${name}-${i}`}>
          {i > 0 && (
            <span aria-hidden className="self-center pb-3 font-display text-xl text-teal lg:text-2xl">
              →
            </span>
          )}
          <span className="min-w-0 flex-1 basis-0">
            <ShirtBack kit={kits[name]?.kit} name={kits[name]?.short ?? name.slice(0, 3)} lettering="tag" className="mx-auto max-w-[74px] lg:max-w-[96px]" />
          </span>
        </Fragment>
      ))}
    </div>
  );
}
