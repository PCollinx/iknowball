"use client";

import { useActionState, useState } from "react";
import { joinWaitlist } from "@/app/waitlist/actions";
import { SubmitButton } from "@/components/daily/SubmitButton";
import { ShirtBack, shirtName } from "@/components/daily/ShirtBack";
import { kitOf, type Club } from "@/lib/profile/club";
import { SOCIAL } from "@/lib/site";
import { GATES_OPEN_LABEL } from "@/lib/waitlist";

// The team sheet (step 13, option A): four numbered lines with your shirt
// dressing beside them as you fill them in. Signed, your place in the queue is
// printed on the shirt. Reuses PR #31's action, honeypot and queue number.

const FIELD = "w-full rounded-none border-0 border-b-2 border-navy bg-transparent px-0 pt-1 pb-1.5 text-[17px] outline-none placeholder:text-navy/40 focus:border-teal";

type Props = { clubs: Club[]; count: number | null; siteUrl: string };

export function TeamSheet({ clubs, count, siteUrl }: Props) {
  const [state, action] = useActionState(joinWaitlist, null);
  const [name, setName] = useState("");
  const [clubId, setClubId] = useState("");
  const club = clubs.find((c) => String(c.id) === clubId) ?? null;

  if (state && "ok" in state) {
    const mine = clubs.find((c) => c.id === state.clubId) ?? null;
    return <Signed position={state.position} name={state.name} club={mine} again={state.again} siteUrl={siteUrl} />;
  }

  const premier = clubs.filter((c) => c.in_premier_league);
  const abroad = clubs.filter((c) => !c.in_premier_league);

  return (
    <form action={action} className="relative border-[2.5px] border-navy p-3.5 shadow-[5px_5px_0_var(--color-navy)] lg:px-5 lg:py-[18px] lg:shadow-[6px_6px_0_var(--color-navy)]">
      <div className="flex items-center justify-between gap-2 border-b-[4px] border-double border-navy pb-2 lg:pb-2.5">
        <h2 className="font-display text-[26px] leading-none uppercase lg:text-[32px]">Team sheet</h2>
        {count !== null && <span className="label text-[9px] lg:text-[10px]">{count.toLocaleString("en-GB")} names down</span>}
      </div>

      <div className="mt-3 grid grid-cols-[minmax(0,1fr)_92px] gap-x-3.5 gap-y-3 lg:mt-3.5 lg:grid-cols-[minmax(0,1fr)_128px] lg:gap-x-5 lg:gap-y-3.5">
        <div className="col-start-2 row-span-2 row-start-1 self-start lg:row-span-3">
          <ShirtBack kit={kitOf(club)} lettering="tag" name={name.trim() ? shirtName(name.trim()) : "You"} />
        </div>
        <Line n={1} label="Email">
          <input name="email" type="email" required autoComplete="email" placeholder="you@example.com" className={FIELD} />
        </Line>
        <Line n={2} label="Name on your shirt">
          <input name="name" maxLength={30} autoComplete="nickname" placeholder="Tunde" value={name} onChange={(e) => setName(e.target.value)} className={FIELD} />
        </Line>
        <Line n={3} label="Who do you support?" className="col-span-2 lg:col-span-1">
          <select name="club" value={clubId} onChange={(e) => setClubId(e.target.value)} className={`${FIELD} appearance-none`}>
            <option value="">Neutral, or rather not say</option>
            <optgroup label="Premier League">
              {premier.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </optgroup>
            <optgroup label="Abroad">
              {abroad.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </optgroup>
          </select>
        </Line>
        <Line n={4} label="Bring your league" optional className="col-span-2">
          <input name="league" maxLength={40} placeholder="Your league's name" className={FIELD} />
        </Line>
      </div>

      {/* Bots fill every field; people never see this one. */}
      <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] h-px w-px" />

      <p role="alert" className="min-h-6 pt-1 text-[15px] font-semibold text-red-card">
        {state && "error" in state ? state.error : ""}
      </p>
      <SubmitButton pendingText="Signing you up…">Get my shirt</SubmitButton>
      <p className="mt-3 text-sm text-navy/70">One email when the gates open. No spam, and your address goes nowhere else.</p>
    </form>
  );
}

function Line({ n, label, optional = false, className = "", children }: { n: number; label: string; optional?: boolean; className?: string; children: React.ReactNode }) {
  return (
    <label className={`flex flex-col gap-1 ${className}`}>
      <span className="label flex items-center gap-1.5 text-[11px]">
        <span className="grid size-6 shrink-0 place-items-center rounded-full border-2 border-navy bg-teal-light font-display text-[13px] tracking-normal">{n}</span>
        {label}
        {optional && <span className="text-[13px] font-normal tracking-normal normal-case">(optional)</span>}
      </span>
      {children}
    </label>
  );
}

function Signed({ position, name, club, again, siteUrl }: { position: number; name: string; club: Club | null; again: boolean; siteUrl: string }) {
  const [note, setNote] = useState("");
  const text = `I'm No. ${position} on the iKnowBall team sheet. Think you know ball?`;

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ text, url: siteUrl });
      } catch {
        // Closing the share sheet isn't an error.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(`${text} ${siteUrl}`);
      setNote("Link copied. Send it to your mates.");
    } catch {
      setNote(siteUrl);
    }
  }

  return (
    <div data-signed>
      <span className="label text-teal">{again ? "Already on the sheet" : "Name's on the sheet"}</span>
      <h2 className="mt-2 font-display text-[72px] leading-[0.82] uppercase lg:text-[96px]">
        You&apos;re
        <br />
        No. {position}
      </h2>
      <div className="mt-[18px] flex justify-center border-b-[6px] border-navy bg-mist pt-[22px] pb-[18px]">
        <div className="w-[150px] lg:w-[170px]">
          <ShirtBack kit={kitOf(club)} lettering="number" name={name ? shirtName(name) : "You"} num={position} pop />
        </div>
      </div>
      <p className="mt-3.5 text-base leading-snug">
        We&apos;ll email you on {GATES_OPEN_LABEL} when the gates open. Bring your mates and your league starts on day one.
      </p>
      <button type="button" onClick={share} className="btn-white btn-press mt-4 flex w-full items-center justify-between px-4 py-3 font-display text-[24px] uppercase lg:text-[26px]">
        <span>Bring your mates</span>
        <span aria-hidden="true">→</span>
      </button>
      <p role="status" className="min-h-[22px] pt-1.5 text-[15px] font-semibold text-teal">
        {note}
      </p>
      <a href={SOCIAL.x.url} className="label mt-2 inline-block text-[10px] text-slate underline-offset-[3px] hover:underline">
        Follow the teasers on X · {SOCIAL.x.handle}
      </a>
    </div>
  );
}
