"use client";

import { useActionState, useMemo, useState } from "react";
import { saveList, type ListState } from "@/app/maker/actions";
import { LIST_FORMATS, parseList, type ListKind } from "@/lib/curated/lists";

const input = "w-full border-2 border-navy bg-white p-2.5";

/** One hand-kept list as text, checked as you type and saved whole. */
export function ListEditor({ kind, text, uses }: { kind: ListKind; text: string; uses: string }) {
  const [state, action, saving] = useActionState<ListState, FormData>(saveList, null);
  const [value, setValue] = useState(text);
  const parsed = useMemo(() => parseList(kind, value), [kind, value]);
  const format = LIST_FORMATS[kind];
  const changed = value !== text;

  return (
    <form action={action} className="grid gap-3 border-t-[3px] border-double border-navy pt-4 lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-6">
      <input type="hidden" name="kind" value={kind} />
      <div className="grid gap-1.5">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-display text-[32px] leading-none uppercase">{format.title}</h2>
          <span className="label text-navy/60">{parsed.rows.length} rows</span>
        </div>
        <label htmlFor={`list-${kind}`} className="sr-only">
          {format.title}
        </label>
        <textarea
          id={`list-${kind}`}
          name="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={Math.min(18, Math.max(6, parsed.rows.length + 2))}
          spellCheck={false}
          placeholder={format.example}
          className={`${input} font-mono text-[14px] leading-relaxed`}
        />
        {parsed.errors.length > 0 && (
          <ul className="grid gap-1 text-[15px] font-semibold text-red-card">
            {parsed.errors.slice(0, 8).map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        )}
      </div>
      <aside className="grid content-start gap-3 bg-mist p-4">
        <p className="label">One a line</p>
        <p className="text-[15px] font-semibold">{format.line}</p>
        <p className="font-mono text-[13px] break-words text-navy/70">{format.example}</p>
        <p className="text-[15px]">{uses}</p>
        <div aria-live="polite" className="text-[15px]">
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
                <p key={w} className="text-navy/70">
                  {w}
                </p>
              ))}
            </>
          )}
        </div>
        <button
          type="submit"
          disabled={saving || !changed || parsed.errors.length > 0}
          className="btn-teal btn-press flex items-center justify-between px-4 py-2.5 font-display text-2xl uppercase disabled:opacity-50"
        >
          <span>{saving ? "Saving" : "Save list"}</span>
          <span aria-hidden>→</span>
        </button>
      </aside>
    </form>
  );
}
