import Link from "next/link";
import { ShirtBack } from "@/components/daily/ShirtBack";
import type { FanbaseLine, TableLine } from "@/lib/league/data";
import { kitOf } from "@/lib/profile/club";

/** Players or Fanbase: the two weekly tables everyone is on. `preview` keeps test sites' sample data on the links. */
export function RankToggle({ on, preview = false }: { on: "players" | "fans"; preview?: boolean }) {
  const q = preview ? "?preview=1" : "";
  const tab = (key: typeof on, href: string, text: string) => (
    <Link
      href={href}
      aria-current={on === key ? "page" : undefined}
      className={`pt-2 pb-2.5 text-center font-display text-[20px] leading-none uppercase ${on === key ? "bg-navy text-white" : "bg-white text-navy"}`}
    >
      {text}
    </Link>
  );
  return (
    <nav className="mt-3 grid grid-cols-2 border-2 border-navy">
      {tab("players", `/league/everyone${q}`, "Players")}
      {tab("fans", `/league/fans${q}`, "Fanbase")}
    </nav>
  );
}

function PlayerRow({ r }: { r: TableLine }) {
  const cell = r.mine ? "bg-royal text-white" : "";
  return (
    <tr className="border-b border-track">
      <td className={`w-11 py-2 pl-1 font-display text-[22px] leading-none ${cell}`}>{r.position}</td>
      <td className={`max-w-0 truncate py-2 font-semibold ${cell}`}>
        <span className={`mr-1.5 inline-block w-[22px] align-[-6px] ${r.mine ? "[filter:drop-shadow(0_0_1px_#fff)_drop-shadow(0_0_1px_#fff)]" : ""}`}>
          <ShirtBack kit={kitOf(r.club)} />
        </span>
        {r.mine ? "You" : r.name}
      </td>
      <td className={`w-16 py-2 pr-1 text-right font-display text-[24px] leading-none ${cell}`}>{r.points}</td>
    </tr>
  );
}

/** Everyone's week: the top of the table, then a gap and your own row if you're further down. */
export function PlayerRanks({ top, mine }: { top: TableLine[]; mine: TableLine | null }) {
  return (
    <table className="mt-2 w-full border-collapse tabular-nums">
      <tbody>
        {top.map((r) => (
          <PlayerRow key={r.userId} r={r} />
        ))}
        {mine && (
          <>
            <tr aria-hidden="true">
              <td colSpan={3} className="py-1 text-center font-display text-lg leading-none text-navy/50">
                ⋮
              </td>
            </tr>
            <PlayerRow r={mine} />
          </>
        )}
      </tbody>
    </table>
  );
}

/** Clubs by their fans' average week. */
export function FanRanks({ rows }: { rows: FanbaseLine[] }) {
  return (
    <table className="mt-2 w-full border-collapse tabular-nums">
      <tbody>
        {rows.map((r) => {
          const cell = r.mine ? "bg-royal text-white" : "";
          return (
            <tr key={r.clubId} className="border-b border-track">
              <td className={`w-11 py-2 pl-1 font-display text-[22px] leading-none ${cell}`}>{r.position}</td>
              <td className={`max-w-0 truncate py-2 font-semibold ${cell}`}>
                <span className={`mr-1.5 inline-block w-[22px] align-[-6px] ${r.mine ? "[filter:drop-shadow(0_0_1px_#fff)_drop-shadow(0_0_1px_#fff)]" : ""}`}>
                  <ShirtBack kit={kitOf(r.club)} />
                </span>
                {r.club.name}
                <small className={`ml-[28px] block text-xs font-normal ${r.mine ? "text-white/80" : "text-navy/60"}`}>
                  {r.fans} {r.fans === 1 ? "fan" : "fans"} playing
                </small>
              </td>
              <td className={`w-16 py-2 pr-1 text-right font-display text-[24px] leading-none ${cell}`}>{r.average}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
