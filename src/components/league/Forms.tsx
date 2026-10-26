"use client";

import { useActionState } from "react";
import { createLeague, joinLeague, type LeagueFormState } from "@/app/(site)/league/actions";

const START: LeagueFormState = { error: null };

/** "box": a framed form under the album page. "slot": an empty album slot,
 * numbered, for a first visit with no league yet (League hub "D", 26 Oct 2026). */
type Look = { look?: "box" | "slot"; n?: number; note?: string };

function Frame({ look = "box", n, note, children }: Look & { children: React.ReactNode }) {
  if (look === "box") return <div className="border-[3px] border-navy bg-white p-3 lg:p-3.5">{children}</div>;
  return (
    <div>
      <div className="border-2 border-dashed border-[#9AA6C8] p-3">
        <span aria-hidden="true" className="block font-display text-[40px] leading-[0.8] text-[#9AA6C8]">
          {n}
        </span>
        {children}
      </div>
      {note && <p className="label mt-1.5 px-0.5 text-[9px] lg:text-[10px]">{note}</p>}
    </div>
  );
}

const TITLE = "block font-display text-[28px] leading-[0.9] uppercase lg:text-[32px]";
const SUBMIT = "btn-press shrink-0 px-3.5 font-display text-[22px] uppercase disabled:opacity-60";

/** Start a league: a name, then straight to its invite. */
export function StartLeague(props: Look) {
  const [state, action, pending] = useActionState(createLeague, START);
  return (
    <Frame {...props}>
      <form action={action}>
        <label htmlFor="league-name" className={`${TITLE} ${props.look === "slot" ? "mt-1" : ""}`}>
          Start a <span className="sash-mark">league</span>
        </label>
        <div className="mt-2 flex gap-2">
          <input
            id="league-name"
            name="name"
            required
            minLength={2}
            maxLength={40}
            placeholder="Sunday League Legends"
            className="min-w-0 flex-1 border-2 border-navy bg-white px-2.5 py-2 font-semibold"
          />
          <button type="submit" disabled={pending} className={`btn-navy ${SUBMIT}`}>
            {pending ? "…" : "Start"}
          </button>
        </div>
        {state.error && (
          <p role="alert" className="mt-2 text-sm font-semibold text-red-card">
            {state.error}
          </p>
        )}
      </form>
    </Frame>
  );
}

/** Join a league with the 6-character code a friend sent. */
export function JoinLeague({ code = "", ...props }: Look & { code?: string }) {
  const [state, action, pending] = useActionState(joinLeague, START);
  return (
    <Frame {...props}>
      <form action={action}>
        <label htmlFor="league-code" className={`${TITLE} ${props.look === "slot" ? "mt-1" : ""}`}>
          Got a <span className="sash-mark">code?</span>
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
            className="min-w-0 flex-1 border-2 border-navy bg-white px-2.5 py-1 font-display text-[26px] tracking-[0.2em] uppercase"
          />
          <button type="submit" disabled={pending} className={`btn-teal ${SUBMIT}`}>
            {pending ? "…" : "Join"}
          </button>
        </div>
        {state.error && (
          <p role="alert" className="mt-2 text-sm font-semibold text-red-card">
            {state.error}
          </p>
        )}
      </form>
    </Frame>
  );
}

/** One-tap join from an invite link. */
export function JoinButton({ code }: { code: string }) {
  const [state, action, pending] = useActionState(joinLeague, START);
  return (
    <form action={action}>
      <input type="hidden" name="code" value={code} />
      <button
        type="submit"
        disabled={pending}
        className="btn-press w-full border-2 border-navy bg-royal sash p-3 text-left font-display text-[26px] text-white uppercase shadow-[4px_4px_0_var(--color-navy)] [--btn-shadow:var(--color-navy)] disabled:bg-track disabled:bg-none"
      >
        {pending ? "Joining…" : "Join the league"}
      </button>
      {state.error && (
        <p role="alert" className="mt-2 font-semibold text-red-card">
          {state.error}
        </p>
      )}
    </form>
  );
}
