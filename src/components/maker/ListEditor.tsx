"use client";

import { useActionState, useMemo, useState } from "react";
import { saveList, type ListState } from "@/app/maker/actions";
import { LIST_FORMATS, parseList, type ListKind } from "@/lib/curated/lists";

// The lists (maker redesign, 31 Oct 2026): a menu of the lists on the left,
// with their rows and the templates that use them; the chosen one's editor on
// the right. Every editor stays mounted, so switching keeps what you typed.

export type ListEntry = { kind: ListKind; text: string; rows: number; uses: string };

export function ListBook({ lists }: { lists: ListEntry[] }) {
  const [open, setOpen] = useState(lists[0].kind);
  return (
    <div className="grid items-start gap-4 md:grid-cols-[240px_minmax(0,1fr)] md:gap-5">
      <div role="group" aria-label="Lists" className="border-2 border-navy">
        {lists.map((l) => (
          <button
            key={l.kind}
            type="button"
            aria-pressed={open === l.kind}
            onClick={() => setOpen(l.kind)}
            className="grid w-full grid-cols-[minmax(0,1fr)_auto] gap-x-2 border-t border-track px-2.5 py-2 text-left first:border-t-0 aria-pressed:bg-navy aria-pressed:text-white"
          >
            <b className="font-semibold">{LIST_FORMATS[l.kind].title}</b>
            <span className="font-display text-base">{l.rows}</span>
            <span className="col-span-2 text-[11px] leading-snug opacity-70">{l.uses}</span>
          </button>
        ))}
      </div>
      {lists.map((l) => (
        <ListEditor key={l.kind} kind={l.kind} text={l.text} uses={l.uses} hidden={open !== l.kind} />
      ))}
    </div>
  );
}

/** One hand-kept list as text, checked as you type and saved whole. */
function ListEditor({ kind, text, uses, hidden }: { kind: ListKind; text: string; uses: string; hidden: boolean }) {
  const [state, action, saving] = useActionState<ListState, FormData>(saveList, null);
  const [value, setValue] = useState(text);
  const parsed = useMemo(() => parseList(kind, value), [kind, value]);
  const format = LIST_FORMATS[kind];
  const changed = value !== text;

  return (
    <form action={action} hidden={hidden} className="min-w-0">
      <input type="hidden" name="kind" value={kind} />
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-[22px] leading-none uppercase">{format.title}</h2>
        <span className="label text-slate">{parsed.rows.length} rows</span>
      </div>
      <p className="mt-1.5 mb-1.5 flex flex-wrap items-center gap-2 text-xs">
        <span className="label">One a line</span>
        <code className="bg-navy px-1.5 py-px text-teal-light">{format.line}</code>
        <span className="font-mono break-all text-slate">{format.example}</span>
      </p>
      <label htmlFor={`list-${kind}`} className="sr-only">
        {format.title}
      </label>
      <textarea
        id={`list-${kind}`}
        name="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={Math.min(20, Math.max(8, parsed.rows.length + 2))}
        spellCheck={false}
        placeholder={format.example}
        className="w-full border-2 border-navy bg-white px-2.5 py-2 font-mono text-[13px] leading-relaxed"
      />
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2.5">
        <ul className="flex flex-wrap gap-1.5 text-xs">
          <li className="border-[1.5px] border-navy bg-teal-light px-1.5">{parsed.rows.length} rows read</li>
          {parsed.errors.slice(0, 6).map((e) => (
            <li key={e} className="border-[1.5px] border-red-card px-1.5 text-red-card">
              {e}
            </li>
          ))}
          {parsed.errors.length > 6 && <li className="px-1.5 text-red-card">and {parsed.errors.length - 6} more</li>}
        </ul>
        <button
          type="submit"
          disabled={saving || !changed || parsed.errors.length > 0}
          className="btn-teal btn-press flex items-center justify-between gap-4 px-4 py-1.5 font-display text-xl uppercase disabled:opacity-50"
        >
          <span>{saving ? "Saving" : "Save list"}</span>
          <span aria-hidden>→</span>
        </button>
      </div>
      <div aria-live="polite" className="mt-2 text-sm">
        {state?.ok === false && (
          <ul className="grid gap-1 font-semibold text-red-card">
            {state.errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        )}
        {state?.ok && !saving && (
          <>
            <p className="font-semibold text-royal">Saved {state.rows} rows.</p>
            {state.warnings.map((w) => (
              <p key={w} className="text-slate">
                {w}
              </p>
            ))}
          </>
        )}
      </div>
      <p className="mt-1 text-[13px] text-slate">Used by: {uses}</p>
    </form>
  );
}
