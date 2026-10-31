"use client";

import { useMemo, useState, useTransition } from "react";
import { strikeClash } from "@/app/maker/actions";
import type { PoolRow } from "@/lib/clash/maker";
import { USUAL, type LiveStat } from "@/lib/clash/rules";

/** The maker's Clash pool for one stat: search it, strike a wrong number out or put it back. */
export function PoolTable({ stat, rows, unit }: { stat: LiveStat; rows: PoolRow[]; unit: string }) {
  const [find, setFind] = useState("");
  const [pending, start] = useTransition();
  const shown = useMemo(() => {
    const q = find.trim().toLowerCase();
    return q ? rows.filter((r) => `${r.name} ${r.club}`.toLowerCase().includes(q)) : rows;
  }, [find, rows]);
  const struck = rows.filter((r) => r.struck).length;
  const [low, high] = USUAL[stat];

  function toggle(r: PoolRow) {
    const data = new FormData();
    data.set("stat", stat);
    data.set("player", String(r.playerId));
    data.set("club", String(r.clubId));
    data.set("struck", r.struck ? "1" : "0");
    start(() => strikeClash(data));
  }

  return (
    <>
      <div className="mb-2 flex flex-wrap items-center gap-2 text-[13px]">
        <label htmlFor="pool-find" className="label">
          Find
        </label>
        <input
          id="pool-find"
          type="search"
          value={find}
          onChange={(e) => setFind(e.target.value)}
          placeholder="Player or club"
          className="min-w-0 flex-[1_1_160px] border-2 border-navy px-2 py-1"
        />
        <span className={pending ? "text-slate" : ""}>{pending ? "Saving…" : `${struck} struck out`}</span>
      </div>
      <div className="max-h-[70vh] overflow-auto border-2 border-navy">
        <table className="w-full border-collapse text-[13px]">
          <thead className="sticky top-0">
            <tr className="bg-mist text-left text-[10px] tracking-[0.06em] uppercase">
              <th className="px-2 py-1.5">Player</th>
              <th className="px-2 py-1.5">Club</th>
              <th className="px-2 py-1.5 text-right">{unit}</th>
              <th className="px-2 py-1.5 text-right">Wiki</th>
              <th className="px-2 py-1.5" />
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={`${r.playerId}-${r.clubId}`} className={`border-t border-track ${r.struck ? "text-slate" : ""}`}>
                <td className={`px-2 py-1 ${r.struck ? "line-through decoration-red-card decoration-2" : ""}`}>
                  {r.name}
                  {(r.value < low || r.value > high) && <span className="ml-1 text-[10px] font-semibold text-red-card uppercase">Check</span>}
                </td>
                <td className="px-2 py-1 whitespace-nowrap">{r.club}</td>
                <td className={`px-2 py-1 text-right tabular-nums ${r.struck ? "line-through decoration-red-card decoration-2" : ""}`}>{r.value}</td>
                <td className="px-2 py-1 text-right text-slate tabular-nums">{r.sitelinks ?? "–"}</td>
                <td className="px-2 py-1 text-right">
                  <button
                    type="button"
                    onClick={() => toggle(r)}
                    disabled={pending}
                    className={`border-2 px-2 text-xs font-semibold disabled:opacity-50 ${r.struck ? "border-red-card bg-red-card text-white" : "border-navy bg-white"}`}
                  >
                    {r.struck ? "Put back" : "Strike"}
                  </button>
                </td>
              </tr>
            ))}
            {!shown.length && (
              <tr>
                <td colSpan={5} className="px-2 py-3 text-slate">
                  Nobody matches.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
