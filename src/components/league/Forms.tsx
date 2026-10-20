"use client";

import { useActionState } from "react";
import { createLeague, joinLeague, type LeagueFormState } from "@/app/league/actions";

const START: LeagueFormState = { error: null };

/** Start a league: a name, then straight to its invite. */
export function StartLeague() {
  const [state, action, pending] = useActionState(createLeague, START);
  return (
    <form action={action} className="border-[3px] border-navy p-3">
      <label htmlFor="league-name" className="block font-display text-[30px] leading-[0.9] uppercase">
        Start a <span className="text-royal">league</span>
      </label>
      <div className="mt-2 flex gap-2">
        <input
          id="league-name"
          name="name"
          required
          minLength={2}
          maxLength={40}
          placeholder="Sunday League Legends"
          className="min-w-0 flex-1 border-2 border-navy px-2.5 py-2 font-semibold"
        />
        <button type="submit" disabled={pending} className="bg-royal px-4 pt-1.5 pb-2 font-display text-[22px] text-white uppercase disabled:bg-track">
          {pending ? "…" : "Start"}
        </button>
      </div>
      {state.error && <p role="alert" className="mt-2 text-sm font-semibold text-red-card">{state.error}</p>}
    </form>
  );
}

/** Join a league with the 6-character code a mate sent. */
export function JoinLeague({ code = "" }: { code?: string }) {
  const [state, action, pending] = useActionState(joinLeague, START);
  return (
    <form action={action} className="border-[3px] border-navy p-3">
      <label htmlFor="league-code" className="block font-display text-[30px] leading-[0.9] uppercase">
        Got a <span className="text-royal">code?</span>
      </label>
      <div className="mt-2 flex gap-2">
        <input
          id="league-code"
          name="code"
          required
          defaultValue={code}
          maxLength={6}
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          placeholder="K7Q2XY"
          className="min-w-0 flex-1 border-2 border-navy px-2.5 py-1.5 font-display text-[26px] tracking-[0.2em] uppercase"
        />
        <button type="submit" disabled={pending} className="bg-royal px-4 pt-1.5 pb-2 font-display text-[22px] text-white uppercase disabled:bg-track">
          {pending ? "…" : "Join"}
        </button>
      </div>
      {state.error && <p role="alert" className="mt-2 text-sm font-semibold text-red-card">{state.error}</p>}
    </form>
  );
}

/** One-tap join from an invite link. */
export function JoinButton({ code }: { code: string }) {
  const [state, action, pending] = useActionState(joinLeague, START);
  return (
    <form action={action}>
      <input type="hidden" name="code" value={code} />
      <button type="submit" disabled={pending} className="w-full bg-royal sash p-3.5 font-display text-[28px] text-white uppercase disabled:bg-track disabled:bg-none">
        {pending ? "Joining…" : "Join the league"}
      </button>
      {state.error && <p role="alert" className="mt-2 font-semibold text-red-card">{state.error}</p>}
    </form>
  );
}
