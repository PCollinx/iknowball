import Link from "next/link";
import { ShirtBack, shirtName } from "@/components/daily/ShirtBack";
import { ordinal } from "@/components/daily/formats";
import { fanName } from "@/components/daily/fixture";
import { StartOne } from "@/components/league/StartOne";
import type { Hub, HubLine } from "@/lib/league/data";
import type { Club } from "@/lib/profile/club";
import { kitOf } from "@/lib/profile/club";

// The League hub, "D" (picked 26 Oct 2026, mocks at
// https://claude.ai/artifact/Lcqpxhr7GQS8FvB5HWJZBV): an album page with a
// sticker for each of your leagues and a slot for the next one, then
// Everyone and your club's fans as two stickers stuck below it.

const TILTS = ["-rotate-[1.5deg]", "rotate-1", "rotate-[0.8deg]", "-rotate-1", "rotate-[1.4deg]"];

/** ▲ 2 in light teal, ▼ 1 in red, a dash when you haven't moved. */
export function MoveTag({ moved, className = "" }: { moved: number | null; className?: string }) {
  const up = (moved ?? 0) > 0;
  const down = (moved ?? 0) < 0;
  return (
    <span className={`label border-[1.5px] border-navy px-1 leading-snug ${up ? "bg-teal-light" : "bg-white"} ${down ? "text-red-card" : ""} ${className}`}>
      {up ? `▲ ${moved}` : down ? `▼ ${-moved!}` : "–"}
      <span className="sr-only">{up ? " places up today" : down ? " places down today" : " no move today"}</span>
    </span>
  );
}

/** The album page: one sticker per league, then "Room for another". `preview` keeps test sites' sample data on the links. */
export function LeagueAlbum({ leagues, preview = false }: { leagues: HubLine[]; preview?: boolean }) {
  return (
    <section aria-label="Your leagues" className="border-2 border-navy bg-mist px-3 pt-4 pb-[18px] lg:px-[18px] lg:pt-5 lg:pb-[22px]">
      <ul className="grid grid-cols-2 gap-x-3 gap-y-3.5 lg:grid-cols-3 lg:gap-x-[18px] lg:gap-y-5">
        {leagues.map((l, i) => (
          <li key={l.league.id}>
            <LeagueSticker line={l} tilt={TILTS[i % TILTS.length]} preview={preview} />
          </li>
        ))}
        <li>
          <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-2 border-2 border-dashed border-[#9AA6C8] p-2.5 text-center lg:min-h-[250px]">
            <span aria-hidden="true" className="font-display text-[44px] leading-[0.8] text-[#9AA6C8] lg:text-[52px]">
              +
            </span>
            <span className="font-display text-xl leading-[0.95] uppercase lg:text-[22px]">Room for another</span>
            <StartOne />
          </div>
        </li>
      </ul>
    </section>
  );
}

function LeagueSticker({ line, tilt, preview }: { line: HubLine; tilt: string; preview: boolean }) {
  const { league, members, position, points, moved, top, gap } = line;
  return (
    <>
      <div className="border-2 border-dashed border-[#9AA6C8] p-1.5 lg:p-2">
        <Link
          href={`/league/${league.invite_code}${preview ? "?preview=table" : ""}`}
          className={`block border-[3px] border-navy bg-white p-1 shadow-[4px_4px_0_var(--color-navy)] transition-[rotate,translate] duration-150 hover:-translate-y-1 hover:rotate-0 lg:p-[5px] lg:shadow-[6px_6px_0_var(--color-navy)] ${tilt}`}
        >
          <span className="block border-2 border-navy">
            <span className="flex items-start justify-between px-1.5 pt-1.5 lg:px-2 lg:pt-2">
              <span className="text-center leading-none">
                <span className="block font-display text-[34px] lg:text-[46px]">{position ? ordinal(position) : "–"}</span>
                <span className="label text-[8px] lg:text-[9px]">Your place</span>
              </span>
              <MoveTag moved={moved} className="text-[9px] lg:text-[10px]" />
            </span>
            <span className="grid grid-cols-3 gap-[3px] px-1.5 pt-1.5 pb-1 lg:gap-1 lg:px-2 lg:pt-2 lg:pb-1.5" aria-hidden="true">
              {top.map((r) => (
                <ShirtBack key={r.userId} kit={kitOf(r.club)} num={r.points > 0 ? r.position : "–"} name={shirtName(r.mine ? "You" : r.name)} />
              ))}
            </span>
            <span className="block truncate bg-royal px-1.5 pt-[5px] pb-1.5 font-display text-[17px] leading-none text-white uppercase lg:px-2 lg:text-[21px]">
              {league.name}
            </span>
            <span className="flex justify-between gap-1 px-1.5 py-1 text-[11px] font-semibold lg:px-2 lg:text-xs">
              <span>
                {members} {members === 1 ? "player" : "players"}
              </span>
              <span className="font-display text-sm tabular-nums lg:text-base">{points} pts</span>
            </span>
          </span>
        </Link>
      </div>
      <p className="label mt-1.5 truncate px-0.5 text-[9px] lg:mt-2 lg:text-[10px]">{gap}</p>
    </>
  );
}

/** First visit, no league yet: the shape of the table to come. */
export function EmptyBoard() {
  return (
    <div className="grid grid-cols-[90px_minmax(0,1fr)] border-2 border-dashed border-[#8E9BD6] bg-white">
      <span className="flex flex-col justify-between gap-1.5 bg-mist p-2.5 text-slate">
        <span className="label text-[10px]">Your place</span>
        <span className="font-display text-5xl leading-[0.85] text-[#8E9BD6]">–</span>
        <span className="label text-[10px]">No league yet</span>
      </span>
      <span className="px-3 py-2.5 text-[13px] text-slate">
        {[
          ["1", "You", "0"],
          ["2", "A friend", "–"],
          ["3", "Another friend", "–"],
        ].map(([n, name, pts]) => (
          <span key={n} className="flex justify-between border-b border-dashed border-track py-[3px]">
            <span>
              <b className="font-display">{n}</b>&nbsp; {name}
            </span>
            <b className="font-display">{pts}</b>
          </span>
        ))}
        <span className="mt-1.5 block">Start one below, or join with a code.</span>
      </span>
    </div>
  );
}

/** Everyone and your club's fans, two stickers side by side. */
export function TableStickers({ everyone, club, fanbase, preview = false }: Pick<Hub, "everyone" | "club" | "fanbase"> & { preview?: boolean }) {
  const q = preview ? "?preview=1" : "";
  const share = everyone.position && everyone.players >= 20 ? Math.max(1, Math.ceil((everyone.position / everyone.players) * 100)) : null;
  const players = everyone.players.toLocaleString("en-GB");
  return (
    <section aria-label="Everyone's tables" className="grid grid-cols-2 gap-3">
      <Link
        href={`/league/everyone${q}`}
        className="block -rotate-1 border-[3px] border-navy bg-navy p-2.5 text-white shadow-[4px_4px_0_var(--color-sky)] transition-[rotate,translate] duration-150 hover:-translate-y-1 hover:rotate-0 lg:p-3 lg:shadow-[5px_5px_0_var(--color-sky)]"
      >
        <span className="label text-[10px] text-teal-light lg:text-[11px]">Everyone</span>
        <span className="mt-1 block font-display text-[46px] leading-[0.85] lg:text-[50px]">{everyone.position ? ordinal(everyone.position) : "–"}</span>
        <span className="label mt-1 block text-[10px] lg:text-[11px]">
          {everyone.position ? (
            <>
              {share ? `Top ${share}%` : `Of ${players}`}
              {everyone.moved ? ` · ${everyone.moved > 0 ? "▲" : "▼"} ${Math.abs(everyone.moved)}` : ""}
            </>
          ) : (
            `${players} playing`
          )}
        </span>
      </Link>
      {club ? <FansSticker club={club} fanbase={fanbase} href={`/league/fans${q}`} /> : <PickClub />}
    </section>
  );
}

function FansSticker({ club, fanbase, href }: { club: Club; fanbase: Hub["fanbase"]; href: string }) {
  return (
    <Link
      href={href}
      className="grid rotate-1 grid-cols-[minmax(0,1fr)_46px] items-end gap-1.5 border-[3px] border-navy bg-white p-2.5 shadow-[4px_4px_0_var(--color-navy)] transition-[rotate,translate] duration-150 hover:-translate-y-1 hover:rotate-0 lg:p-3 lg:shadow-[5px_5px_0_var(--color-navy)]"
    >
      <span className="min-w-0">
        <span className="label block text-[10px] leading-tight text-royal lg:text-[11px]">{fanName(club.name)} fans</span>
        <span className="mt-1 block font-display text-[46px] leading-[0.85] lg:text-[50px]">{fanbase.position ? ordinal(fanbase.position) : "–"}</span>
        <span className="label mt-1 block text-[10px] lg:text-[11px]">{fanbase.position ? `Of ${fanbase.clubs} clubs` : "Needs 25 fans playing"}</span>
      </span>
      <span aria-hidden="true">
        <ShirtBack kit={kitOf(club)} />
      </span>
    </Link>
  );
}

function PickClub() {
  return (
    <Link href="/profile" className="grid grid-cols-[minmax(0,1fr)_46px] items-end gap-1.5 border-2 border-dashed border-[#9AA6C8] p-2.5 lg:p-3">
      <span>
        <span className="label block text-[10px] text-royal lg:text-[11px]">Your club&apos;s fans</span>
        <span className="mt-1 block font-display text-2xl leading-[0.95] uppercase">Pick a club</span>
      </span>
      <span aria-hidden="true">
        <ShirtBack state="empty" num="?" />
      </span>
    </Link>
  );
}
