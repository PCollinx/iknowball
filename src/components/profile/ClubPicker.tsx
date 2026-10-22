"use client";

import { useActionState, useState } from "react";
import { chooseClub } from "@/app/(site)/profile/actions";
import { SubmitButton } from "@/components/daily/SubmitButton";
import { ShirtBack } from "@/components/daily/ShirtBack";
import { kitOf, type Club } from "@/lib/profile/club";

type Props = {
  clubs: Club[];
  /** The club picked now; null for neutral or not yet asked. */
  current: Club | null;
  /** "prompt" after a first Daily (skippable); "change" on the profile. */
  mode: "prompt" | "change";
  /** A few clubs shown first, with "All clubs" opening the rest (full time, 22 Oct 2026). */
  featured?: Club[];
};

/** A rack of club shirts to pick from, plus neutral. With `featured`, only
 * those show until "All clubs" is tapped. */
export function ClubPicker({ clubs, current, mode, featured = [] }: Props) {
  const [state, action] = useActionState(chooseClub, null);
  const [picked, setPicked] = useState(current ? String(current.id) : mode === "change" ? "neutral" : "");
  const [all, setAll] = useState(featured.length === 0);
  const premier = clubs.filter((c) => c.in_premier_league);
  const abroad = clubs.filter((c) => !c.in_premier_league);
  const pick = { picked, onPick: setPicked };

  return (
    <form action={action}>
      {all ? (
        <>
          <Rack label="Premier League" clubs={premier} {...pick} />
          <Rack label="Abroad, or nobody" clubs={abroad} {...pick}>
            <Option value="neutral" label="Neutral" club={null} {...pick} />
          </Rack>
        </>
      ) : (
        <Rack label="Quick picks" clubs={featured} {...pick} />
      )}
      {featured.length > 0 && (
        <button
          type="button"
          onClick={() => setAll(!all)}
          aria-expanded={all}
          className="mt-2 py-1.5 font-semibold text-royal underline underline-offset-4"
        >
          {all ? "Fewer clubs" : `All clubs (${clubs.length + 1})`}
        </button>
      )}

      <p role="alert" className={`min-h-[24px] pt-1 font-semibold ${state && "error" in state ? "text-red-card" : "text-teal"}`}>
        {state && ("error" in state ? state.error : state.ok)}
      </p>
      <SubmitButton pendingText="Saving…" tone={mode === "prompt" ? "white" : "royal"}>
        {mode === "prompt" ? "That's my club" : "Switch club"}
      </SubmitButton>
      {mode === "prompt" && (
        <button type="submit" name="intent" value="skip" formNoValidate className="mt-2 w-full py-2.5 font-semibold underline underline-offset-4">
          Skip for now
        </button>
      )}
    </form>
  );
}

type Pick = { picked: string; onPick: (value: string) => void };

function Rack({ label, clubs, picked, onPick, children }: { label: string; clubs: Club[]; children?: React.ReactNode } & Pick) {
  return (
    <fieldset className="mt-3">
      <legend className="label text-navy/70">{label}</legend>
      <div className="mt-1.5 grid grid-cols-4 gap-x-2 gap-y-1 sm:grid-cols-6 lg:grid-cols-7">
        {clubs.map((c) => (
          <Option key={c.id} value={String(c.id)} label={c.name} club={c} picked={picked} onPick={onPick} />
        ))}
        {children}
      </div>
    </fieldset>
  );
}

function Option({ value, label, club, picked, onPick }: { value: string; label: string; club: Club | null } & Pick) {
  return (
    <label className="group relative cursor-pointer px-1 pt-1.5 pb-1 text-center outline-royal has-checked:bg-mist has-checked:outline-3 has-focus-visible:outline-3 has-focus-visible:outline-teal">
      <input type="radio" name="club" value={value} checked={picked === value} onChange={() => onPick(value)} required className="sr-only" />
      <span className="block transition-transform duration-150 group-hover:-translate-y-1 group-has-checked:-translate-y-1 group-has-checked:-rotate-3">
        <ShirtBack kit={kitOf(club)} lettering="tag" num={club ? club.short_name : "Neutral"} />
      </span>
      <span className="mt-1 block truncate font-display text-[15px] leading-none uppercase group-has-checked:text-royal">{label}</span>
      <span
        aria-hidden="true"
        className="absolute top-0 right-0 hidden h-6 w-6 place-items-center bg-royal font-display text-base text-white group-has-checked:grid"
      >
        ✓
      </span>
    </label>
  );
}
