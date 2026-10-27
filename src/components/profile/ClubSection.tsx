"use client";

import { useState } from "react";
import { ShirtBack } from "@/components/daily/ShirtBack";
import { kitOf, type Club } from "@/lib/profile/club";
import { ClubPicker } from "./ClubPicker";

type Props = {
  club: Club | null;
  /** "Who do you support?" was answered or skipped. */
  asked: boolean;
  switchedThisSeason: boolean;
  /** "2027/28": when a used switch comes back. */
  nextSeason: string;
  clubs: Club[];
};

/** Your club on the profile: the shirt with the switches left, a rack to pick
 * from, and a "Saved" sticker that stays after the page refreshes (the picker
 * closes on save, so its own message would vanish with it). */
export function ClubSection({ club, asked, switchedThisSeason, nextSeason, clubs }: Props) {
  const [open, setOpen] = useState(!club && !asked);
  const [saved, setSaved] = useState<string | null>(null);
  const onSaved = (name: string) => {
    setSaved(name);
    setOpen(false);
  };

  const first = !club && !asked;
  return (
    <>
      {first && !saved ? (
        <p>Pick who you support. It dresses your shirt and puts you in your fanbase table. It never changes your questions or your score.</p>
      ) : (
        <div className="grid grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-3">
          <ShirtBack kit={kitOf(club)} />
          <span className="min-w-0">
            <b className="block truncate font-display text-2xl leading-none uppercase">{club ? club.name : "Neutral"}</b>
            <span className="text-[13px] text-slate">
              {switchedThisSeason
                ? `You've used this season's switch. Next one in ${nextSeason}.`
                : club
                  ? "You can switch once a season"
                  : "Your first pick is free"}
            </span>
          </span>
          <span className="border-2 border-dashed border-navy px-2 py-1 text-center font-display text-[15px] leading-[1.1] uppercase">
            {switchedThisSeason ? "0 switches" : club ? "1 switch" : "First pick"}
            <br />
            {club || switchedThisSeason ? "left" : "free"}
          </span>
        </div>
      )}
      {saved && (
        <p role="status" className="mt-3 inline-block -rotate-2 border-2 border-navy bg-teal-light px-3 py-1 font-display text-xl uppercase shadow-[3px_3px_0_var(--color-navy)]">
          Saved ✓ {saved === "Neutral" ? "Neutral it is" : `${saved} it is`}
        </p>
      )}
      {!switchedThisSeason &&
        (open ? (
          <div className="mt-1">
            <ClubPicker clubs={clubs} current={club} mode="change" onSaved={onSaved} />
            {!first && (
              <button type="button" onClick={() => setOpen(false)} className="mt-2 w-full py-2 font-semibold underline underline-offset-4">
                Keep {club ? club.name : "neutral"}
              </button>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              setOpen(true);
              setSaved(null);
            }}
            className="btn-teal btn-press mt-3 block px-4 py-2 font-display text-xl uppercase"
          >
            {club ? "Switch club" : "Pick a club"}
          </button>
        ))}
    </>
  );
}
