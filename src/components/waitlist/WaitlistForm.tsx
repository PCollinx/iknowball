"use client";

import { useActionState, useState } from "react";
import { joinWaitlist } from "@/app/waitlist/actions";
import { SubmitButton } from "@/components/daily/SubmitButton";
import { ShirtBack, shirtName } from "@/components/daily/ShirtBack";
import { kitOf, type Club } from "@/lib/profile/club";

type Props = { clubs: Club[]; siteUrl: string };

const field = "w-full border-0 border-b-2 border-navy bg-transparent px-0 pt-1 pb-1.5 text-lg outline-none placeholder:text-navy/35 focus:border-royal";

/** The team sheet: email, name, club and "bring your league". The shirt beside
 * it is yours, dressed as you fill it in. */
export function WaitlistForm({ clubs, siteUrl }: Props) {
  const [state, action] = useActionState(joinWaitlist, null);
  const [name, setName] = useState("");
  const [clubId, setClubId] = useState("");
  const [league, setLeague] = useState("");
  const club = clubs.find((c) => String(c.id) === clubId) ?? null;

  if (state && "ok" in state) {
    const mine = clubs.find((c) => c.id === state.clubId) ?? null;
    return <Signed position={state.position} name={state.name} club={mine} again={state.again} siteUrl={siteUrl} />;
  }

  const premier = clubs.filter((c) => c.in_premier_league);
  const abroad = clubs.filter((c) => !c.in_premier_league);

  return (
    <form action={action} className="grid grid-cols-[1fr_96px] gap-x-4 sm:grid-cols-[1fr_128px]">
      <div className="grid content-start gap-4">
        <label className="block">
          <span className="label text-navy/70">Email</span>
          <input name="email" type="email" required autoComplete="email" placeholder="you@example.com" className={field} />
        </label>
        <label className="block">
          <span className="label text-navy/70">Name on your shirt</span>
          <input
            name="name"
            maxLength={30}
            autoComplete="nickname"
            placeholder="Optional"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={field}
          />
        </label>
        <label className="block">
          <span className="label text-navy/70">Who do you support?</span>
          <select name="club" value={clubId} onChange={(e) => setClubId(e.target.value)} className={`${field} appearance-none rounded-none`}>
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
        </label>
      </div>

      <figure className="row-span-2 self-start pt-5">
        <ShirtBack kit={kitOf(club)} lettering="tag" name={name.trim() ? shirtName(name.trim()) : "You"} num={club?.short_name ?? "IKB"} />
        <figcaption className="label mt-1 text-center text-navy/60">Your shirt</figcaption>
      </figure>

      <div className="col-span-2 mt-6 border-t-[3px] border-double border-navy pt-3">
        <h3 className="font-display text-[32px] leading-[0.9] uppercase">
          Bring your <span className="text-royal">league</span>
        </h3>
        <p className="mt-1 text-[15px] text-navy/70">Got a group chat that argues about ball? Name it and we&apos;ll set your league up for launch day.</p>
        <div className="mt-3 grid grid-cols-[1fr_88px] gap-4">
          <label className="block">
            <span className="label text-navy/70">League name</span>
            <input name="league" maxLength={40} placeholder="Optional" value={league} onChange={(e) => setLeague(e.target.value)} className={field} />
          </label>
          <label className="block">
            <span className="label text-navy/70">Mates</span>
            <input name="mates" type="number" min={0} max={100} inputMode="numeric" placeholder="0" disabled={!league.trim()} className={`${field} disabled:opacity-40`} />
          </label>
        </div>
      </div>

      {/* Bots fill every field; people never see this one. */}
      <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] h-px w-px" />

      <div className="col-span-2 mt-6">
        <p role="alert" className="min-h-[24px] pb-1 font-semibold text-red-card">
          {state && "error" in state ? state.error : ""}
        </p>
        <SubmitButton pendingText="Signing you up…">Put me on the list</SubmitButton>
        <p className="mt-2 text-sm text-navy/60">One email when the gates open on Fri 27 Nov. No spam, no selling your address.</p>
      </div>
    </form>
  );
}

function Signed({ position, name, club, again, siteUrl }: { position: number; name: string; club: Club | null; again: boolean; siteUrl: string }) {
  const [note, setNote] = useState("");
  const text = `I'm No. ${position} on the iKnowBall waitlist. Think you know ball?`;

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
      setNote("Link copied. Drop it in the group chat.");
    } catch {
      setNote(siteUrl);
    }
  }

  return (
    <div className="grid grid-cols-[1fr_120px] items-end gap-4 sm:grid-cols-[1fr_160px]">
      <div>
        <span className="label text-teal">{again ? "Already on the list" : "Signed"}</span>
        <h2 className="font-display text-[64px] leading-[0.85] uppercase lg:text-[88px]">
          You&apos;re <span className="text-royal">No. {position}</span>
        </h2>
        <p className="mt-3 text-lg">Kick-off is Fri 27 Nov. We&apos;ll email you the moment the gates open.</p>
      </div>
      <ShirtBack kit={kitOf(club)} lettering="number" name={name ? shirtName(name) : "You"} num={position} pop />
      <div className="col-span-2">
        <button type="button" onClick={share} className="mt-2 w-full bg-royal p-3.5 font-display text-[28px] text-white uppercase">
          Bring your mates
        </button>
        <p role="status" className="min-h-[22px] pt-1 text-[15px] font-semibold text-royal">
          {note}
        </p>
      </div>
    </div>
  );
}
