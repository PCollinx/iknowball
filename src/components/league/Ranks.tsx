import Link from "next/link";
import { ChallengeButton } from "@/components/clash/ChallengeButton";
import { fanName } from "@/components/daily/fixture";
import { ordinal } from "@/components/daily/formats";
import { Pitch } from "@/components/daily/InPlay";
import { ShirtBack, shirtName } from "@/components/daily/ShirtBack";
import { publicEnv } from "@/lib/env";
import type { FanbaseLine, TableLine } from "@/lib/league/data";
import { XI, yourSpot } from "@/lib/league/standing";
import type { Club } from "@/lib/profile/club";
import { kitOf } from "@/lib/profile/club";

// Everyone and the fanbase as "Team of the week" (option C, picked 27 Oct
// 2026): the top 11 on a pitch, 12th to 20th on the bench, and the clubs as
// tickets through the away end's gate.

/** Players or Fanbase: the two weekly tables everyone is on. */
export function RankToggle({ on }: { on: "players" | "fans" }) {
  const tab = (key: typeof on, href: string, text: string) => (
    <Link
      href={href}
      aria-current={on === key ? "page" : undefined}
      className={`pt-2 pb-2.5 text-center font-display text-[20px] leading-none uppercase ${on === key ? "bg-navy text-white" : "bg-white text-navy hover:bg-mist"}`}
    >
      {text}
    </Link>
  );
  return (
    <nav aria-label="Weekly tables" className="grid grid-cols-2 border-2 border-navy">
      {tab("players", "/league/everyone", "Players")}
      {tab("fans", "/league/fans", "Fanbase")}
    </nav>
  );
}

/** Where each place stands on the pitch, in %: 1st and 2nd up front, then midfield, defence and 11th in goal. */
const SPOTS = [
  [35, 9], [65, 9],
  [12, 33], [37, 31], [63, 31], [88, 33],
  [12, 57], [37, 59], [63, 59], [88, 57],
  [50, 80],
] as const;

const tag = (mine: boolean) =>
  `inline-block border-[1.5px] border-navy px-1 font-display text-sm leading-tight lg:text-[15px] ${mine ? "bg-royal text-white" : "bg-white"}`;

/** The top 11 on the pitch, the place on the shirt and the points under it. Empty places wait as dashed shirts. */
export function TeamOfTheWeek({ xi }: { xi: (TableLine | null)[] }) {
  return (
    <Pitch half="attack" className="h-[460px] lg:h-[560px]">
      <ol aria-label="Team of the week">
        {xi.map((r, i) => (
          <li
            key={r?.userId ?? `empty-${i}`}
            className="absolute w-[17%] -translate-x-1/2 text-center lg:w-[13%]"
            style={{ left: `${SPOTS[i][0]}%`, top: `${SPOTS[i][1]}%` }}
          >
            {r ? (
              <>
                <ShirtBack kit={kitOf(r.club)} num={i + 1} name={shirtName(r.mine ? "You" : r.name)} />
                <span className={`mt-0.5 ${tag(r.mine)}`}>
                  {r.points}
                  <span className="sr-only"> points, {r.mine ? "you" : r.name}</span>
                </span>
              </>
            ) : (
              <ShirtBack state="empty" num={i + 1} />
            )}
          </li>
        ))}
      </ol>
    </Pitch>
  );
}

/** 12th to 20th, in a row of shirts. */
export function Bench({ rows }: { rows: TableLine[] }) {
  if (!rows.length) return null;
  return (
    <section aria-label="The bench">
      <div className="flex justify-between border-b-4 border-double border-navy pb-1">
        <span className="label text-[10px]">The bench · 12th to {ordinal(XI + rows.length)}</span>
        <span className="label text-[10px]">Pts / 600</span>
      </div>
      <ol className="mt-2 grid grid-cols-5 gap-2">
        {rows.map((r) => (
          <li key={r.userId} className="text-center">
            <ShirtBack kit={kitOf(r.club)} num={r.position} name={shirtName(r.mine ? "You" : r.name)} />
            <span className={`mt-0.5 ${tag(r.mine)}`}>{r.points}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** Your own spot under the team: in it, on the bench, further down with the gap to 11th, or not played yet. */
export function YourSpot({ mine, club, eleventh, players }: { mine: TableLine | null; club: Club | null; eleventh: number | null; players: number }) {
  const spot = yourSpot(mine, eleventh);
  const gapLine = spot.gap ? `${spot.gap} to get in the team` : "Room in the team: one good Daily gets you in";
  if (spot.kind === "idle" || !mine) {
    return (
      <section className="grid grid-cols-[64px_minmax(0,1fr)] items-center gap-3 border-2 border-dashed border-[#8E9BD6] px-3 py-3.5">
        <ShirtBack kit={kitOf(club)} name="You" lettering="tag" />
        <span>
          <span className="label block text-[10px] text-red-card">Not on the team sheet yet</span>
          <span className="mt-0.5 block font-display text-2xl leading-none uppercase">You haven&apos;t played this week</span>
          <span className="mt-1 block text-[13px] text-slate">
            {players.toLocaleString("en-GB")} {players === 1 ? "player has" : "have"}.{" "}
            {eleventh === null ? "There's still room in the team." : `11th has ${eleventh}: a good Daily and a sprint get you close.`}
          </span>
        </span>
      </section>
    );
  }
  const share = players >= 20 ? Math.max(1, Math.ceil((mine.position / players) * 100)) : null;
  return (
    <section className="sash-edge grid grid-cols-[64px_minmax(0,1fr)_auto] items-center gap-3 bg-slate py-3 pr-[11%] pl-3 text-white">
      <ShirtBack kit={kitOf(mine.club)} num={mine.position} name="You" />
      <span className="min-w-0">
        <span className="label block text-[10px] text-teal-light">
          {spot.kind === "xi" ? "In the team of the week" : spot.kind === "bench" ? "On the bench" : `${ordinal(mine.position)} of ${players.toLocaleString("en-GB")}`}
        </span>
        <span className="mt-0.5 block font-display text-2xl leading-none uppercase">
          {spot.kind === "xi" ? `${ordinal(mine.position)} this week` : gapLine}
        </span>
        {share && <span className="label mt-1 block text-[10px] text-teal-light">Top {share}%</span>}
      </span>
      <span className="text-right">
        <span className="block font-display text-[34px] leading-none">{mine.points}</span>
        <span className="label text-[9px] text-teal-light">/ 600</span>
      </span>
    </section>
  );
}

const TILTS = ["-rotate-[0.4deg]", "rotate-[0.3deg]", "", "-rotate-[0.2deg]"];

/** The away end: every club on the table as a ticket, its place on the stub. */
export function AwayEnd({ rows }: { rows: FanbaseLine[] }) {
  return (
    <section aria-label="Clubs on the table">
      <div className="flex justify-between border-b-4 border-double border-navy pb-1">
        <span className="label text-[10px]">Through the gate</span>
        <span className="label text-[10px]">Average / 600</span>
      </div>
      <ol>
        {rows.map((r, i) => (
          <li
            key={r.clubId}
            className={`mt-2 grid grid-cols-[42px_40px_minmax(0,1fr)_auto] items-center gap-2.5 border-2 border-navy pr-2.5 ${r.mine ? "bg-mist shadow-[4px_4px_0_var(--color-royal)]" : "bg-white"} ${TILTS[i % 4]}`}
          >
            <span
              className={`grid self-stretch place-items-center border-r-2 border-dashed border-navy font-display text-2xl ${r.position <= 3 ? "bg-teal text-white" : "bg-teal-light"}`}
            >
              {r.position}
            </span>
            <span className="py-1" aria-hidden="true">
              <ShirtBack kit={kitOf(r.club)} />
            </span>
            <span className="min-w-0">
              <b className="block truncate font-display text-xl leading-none uppercase">{r.club.name}</b>
              <span className="text-xs text-slate">
                {r.mine ? "Your club · " : ""}
                {r.fans} {r.fans === 1 ? "fan" : "fans"} through the gate
              </span>
            </span>
            <span className="font-display text-[30px] leading-none">{r.average}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** Your club before it makes the table: a seat for each fan it needs, filled as they play. */
export function Gate({ club, fans, minFans }: { club: Club; fans: number; minFans: number }) {
  const url = `${publicEnv().NEXT_PUBLIC_SITE_URL.replace(/\/$/, "")}/league/fans`;
  const short = minFans - fans;
  return (
    <section className="border-2 border-dashed border-navy p-3">
      <div className="grid grid-cols-[44px_minmax(0,1fr)] items-center gap-2.5">
        <ShirtBack kit={kitOf(club)} />
        <span>
          <span className="label block text-[10px] text-red-card">Your club · not in yet</span>
          <span className="block font-display text-2xl leading-none uppercase">
            {club.name}: {fans} of {minFans} fans
          </span>
        </span>
      </div>
      <div className="mt-2.5 grid grid-cols-[repeat(13,minmax(0,1fr))] gap-[3px]" role="img" aria-label={`${fans} of ${minFans} seats filled`}>
        {Array.from({ length: minFans }, (_, i) => (
          <span key={i} className={`h-3.5 border-[1.5px] ${i < fans ? "border-royal bg-royal" : "border-[#8E9BD6] bg-white"}`} />
        ))}
      </div>
      <p className="mt-2 mb-2.5 text-[13px] text-slate">
        {short} more {fanName(club.name)} {short === 1 ? "fan" : "fans"} playing this week and they&apos;re on the table.
      </p>
      <ChallengeButton
        url={url}
        text={`${fanName(club.name)} fans: we need ${short} more playing iKnowBall this week to make the fanbase table.`}
        label="Bring your mates"
      />
    </section>
  );
}
