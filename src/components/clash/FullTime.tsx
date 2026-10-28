import { startSprint } from "@/app/(site)/clash/actions";
import { SubmitButton } from "@/components/daily/SubmitButton";
import { ordinal } from "@/components/daily/formats";
import { ShareButtons } from "@/components/daily/ShareButtons";
import { RatingBadge } from "@/components/profile/RatingBadge";
import type { Result } from "@/lib/clash/data";
import { AlbumPage } from "./Album";
import { ChallengeButton } from "./ChallengeButton";
import { Kick } from "./KickRow";
import { ClashMasthead } from "./Masthead";
import { banter, calledLine, outcomeLabel, outcomeOf, slots, toBeat, verdictLine, type Outcome, type Side } from "./result";

// Full time, option D (picked 25 Oct 2026, docs/redesign-plan.md step 6): the
// sprint as a finished album page, a slot per player with a kick in every one
// you called, the score stuck on it; on someone's challenge, your page beside
// theirs. Then the stickers, the challenge's table and the ticket to send it
// on. Phone is one column; desktop puts the album on the left. The result
// image (/clash/{code}/card) draws the same page.

type Props = {
  code: string;
  statLabel: string;
  setSize: number;
  right: number;
  kicks: string;
  bestRun: number;
  /** Everyone's go at this set, best first. */
  table: Result[];
  siteUrl: string;
  /** Your overall rating out of 10. */
  rating: number | null;
  /** This is your best sprint of its matchweek. */
  weekBest: boolean;
};

export function ClashFullTime({ code, statLabel, setSize, right, kicks, bestRun, table, siteUrl, rating, weekBest }: Props) {
  const mine = table.find((r) => r.mine) ?? null;
  const setter = table.find((r) => r.setter && !r.mine) ?? null;
  const outcome = setter ? outcomeOf(right, setter.right) : null;
  const missed = kicks.length - right;
  const url = `${siteUrl.replace(/\/$/, "")}/clash/${code}`;

  const board = <ChallengeTable table={table} mine={mine} right={right} />;
  const ticket = <Ticket code={code} url={url} setSize={setSize} right={right} table={table} challenge={Boolean(setter)} />;

  return (
    <main className="mx-auto w-full max-w-[560px] flex-1 px-4 pb-10 lg:max-w-[1180px] lg:px-12">
      <ClashMasthead left={setter ? "Clash · Challenge · Full time" : "Clash · Full time"} right={code} />
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_440px] lg:items-start lg:gap-14">
        <div className="min-w-0">
          <section className="pt-3.5 lg:pt-6">
            {setter && (
              <span className="label text-[10px] text-royal lg:text-[11px]">
                {setter.name}&apos;s challenge · {statLabel}
              </span>
            )}
            <h1 className="mt-1 font-display text-[60px] leading-[0.84] uppercase lg:text-[96px] lg:leading-[0.82]">
              Full <span className="sash-mark">time</span>
            </h1>
            <p className="mt-1.5 text-sm lg:mt-2 lg:text-base">
              {calledLine(kicks.length, setSize)}.{setter && outcome && <> {verdictLine(setter, outcome)}</>}
            </p>
          </section>

          {setter ? (
            <section className="mt-7.5 grid grid-cols-2 gap-3 lg:mt-9 lg:gap-7" aria-label="Head to head">
              <SidePage side={{ name: "You", right, kicks, bestRun }} size={Math.max(kicks.length, setter.kicks.length)} mine />
              <SidePage side={setter} size={Math.max(kicks.length, setter.kicks.length)} />
            </section>
          ) : (
            <AlbumPage label={statLabel} className="mt-7.5 lg:mt-9">
              <KickAlbum kicks={kicks} size={kicks.length} large />
              <div className="mt-3.5 flex items-end justify-between gap-3 lg:mt-5">
                <ScoreSticker right={right} />
                <span className="mb-2.5 -rotate-[8deg] border-4 border-red-card bg-white/90 px-2 pt-0.5 pb-1 font-display text-xl leading-none min-[380px]:text-2xl whitespace-nowrap text-red-card uppercase lg:text-[30px]">
                  {missed === 0 ? "Clean sheet" : `${missed} missed`}
                </span>
              </div>
            </AlbumPage>
          )}

          <Stickers outcome={outcome} bestRun={bestRun} weekBest={weekBest} rating={rating} />
          <p className="mt-3.5 font-display text-base leading-tight uppercase lg:mt-4 lg:text-2xl lg:leading-none">
            <span className="text-red-card">“</span>
            {banter(right, setter, mine)}
            <span className="text-red-card">”</span>
          </p>
        </div>

        <aside className="mt-6.5 grid gap-6.5 lg:mt-0 lg:gap-7.5 lg:pt-6">
          {setter ? (
            <>
              {board}
              {ticket}
            </>
          ) : (
            <>
              {ticket}
              {board}
            </>
          )}
          <div className="grid gap-3">
            <ShareButtons
              text={`I got ${right} right in 60 seconds of Higher or Lower on iKnowBall. Beat that: ${url}`}
              image={{ url: `/clash/${code}/card`, name: `iknowball-clash-${code}.png` }}
              className="mt-0"
            />
            <form action={startSprint}>
              <SubmitButton tone="navy" pendingText="Picking…">
                {setter ? "Your own sprint" : "New sprint"}
              </SubmitButton>
            </form>
          </div>
        </aside>
      </div>
    </main>
  );
}

/** A page of the album: a kick in a slot for every call made (Collins, 25 Oct
 * 2026: not the whole set, which nobody gets through in a minute). */
function KickAlbum({ kicks, size, large = false }: { kicks: string; size: number; large?: boolean }) {
  const right = [...kicks].filter((k) => k === "1").length;
  return (
    <ol
      className={`grid grid-cols-8 ${large ? "gap-1.25 lg:gap-1.5" : "gap-0.5 lg:gap-1"}`}
      aria-label={`${right} scored, ${kicks.length - right} missed`}
    >
      {slots(kicks, Math.max(1, size)).map((k, i) => (
        <li
          key={i}
          className={`grid aspect-square place-items-center ${k === null ? "border-[1.5px] border-dashed border-[#8E9BD6] bg-[#E3E8FF]" : large ? "p-[3px]" : "lg:p-0.5"}`}
        >
          {k !== null && <Kick scored={k === "1"} />}
        </li>
      ))}
    </ol>
  );
}

function ScoreSticker({ right, small = false, ink = "text-royal", tilt = "-rotate-3" }: { right: number; small?: boolean; ink?: string; tilt?: string }) {
  return (
    <span
      className={`inline-flex items-baseline gap-2 border-navy bg-white font-display uppercase ${tilt} ${
        small
          ? "border-2 px-2 pt-0.5 pb-1 shadow-[3px_3px_0_var(--color-navy)] lg:border-[2.5px] lg:px-3 lg:pt-1 lg:pb-1.5 lg:shadow-[4px_4px_0_var(--color-navy)]"
          : "border-[2.5px] px-3.5 pt-1.5 pb-2 shadow-[5px_5px_0_var(--color-navy)]"
      }`}
    >
      <span className={`leading-[0.8] tabular-nums ${ink} ${small ? "text-[44px] lg:text-[64px]" : "text-[84px] lg:text-[112px]"}`}>{right}</span>
      <span className={small ? "hidden text-xl lg:inline" : "text-[26px] lg:text-[32px]"}>right</span>
    </span>
  );
}

/** One side of the head-to-head: a player's own page, their name on a tag. */
function SidePage({ side, size, mine = false }: { side: Side; size: number; mine?: boolean }) {
  const missed = side.kicks.length - side.right;
  return (
    <div className={`relative min-w-0 border-2 bg-mist px-[7px] pt-5.5 pb-2 lg:px-3.5 lg:pt-7 lg:pb-3.5 ${mine ? "border-royal" : "border-navy"}`}>
      <span
        className={`absolute -top-[11px] left-2 max-w-[85%] -rotate-3 truncate border-2 border-navy px-2 py-px font-display text-[15px] uppercase shadow-[2px_2px_0_var(--color-navy)] lg:-top-3.5 lg:left-3.5 lg:px-2.5 lg:text-xl lg:shadow-[3px_3px_0_var(--color-navy)] ${mine ? "bg-teal-light" : "bg-navy text-white"}`}
      >
        {side.name}
      </span>
      <KickAlbum kicks={side.kicks} size={size} />
      <div className="mt-2 flex items-end justify-between gap-1 lg:mt-3">
        <ScoreSticker right={side.right} small ink={mine ? "text-royal" : "text-navy"} tilt={mine ? "-rotate-3" : "rotate-2"} />
        <span className="label text-right text-[9px] leading-[1.4] lg:text-[11px] lg:leading-normal">
          {missed} missed
          <br />
          run {side.bestRun}
        </span>
      </div>
    </div>
  );
}

/** The result, the best run, the week and the rating, as small tilted stickers. */
function Stickers({ outcome, bestRun, weekBest, rating }: { outcome: Outcome | null; bestRun: number; weekBest: boolean; rating: number | null }) {
  const word = outcome ? outcomeLabel(outcome).split(" ") : null;
  return (
    <ul className="mt-4 flex flex-wrap items-center gap-2 text-sm lg:mt-5.5 lg:gap-2.5 lg:text-[15px]">
      {word && (
        <li className={`-rotate-[1.5deg] border-2 border-navy px-2.5 py-1 shadow-[3px_3px_0_var(--color-navy)] ${outcome?.kind === "lost" ? "bg-white" : "bg-teal-light"}`}>
          <b className="font-display text-xl uppercase lg:text-2xl">{word[0]}</b> {word.slice(1).join(" ")}
        </li>
      )}
      <li className="rotate-1 border-2 border-navy bg-white px-2.5 py-1 shadow-[3px_3px_0_var(--color-navy)]">
        <b className="font-display text-xl lg:text-2xl">{bestRun}</b> best run
      </li>
      {weekBest && (
        <li className="-rotate-1 border-2 border-navy bg-teal-light px-2.5 py-1 shadow-[3px_3px_0_var(--color-navy)]">
          <b className="font-display text-xl uppercase lg:text-2xl">Best</b> this week
        </li>
      )}
      <li className="flex -rotate-[0.6deg] items-center gap-1.5 border-2 border-navy bg-navy px-2.5 py-1 text-white shadow-[3px_3px_0_var(--color-sky)]">
        <RatingBadge rating={rating} className="size-6 text-[13px] lg:size-7 lg:text-sm" />
        rating
      </li>
    </ul>
  );
}

const WAITING = 3;

/** Everyone who played the set, as the home page's scoreboard: your place on navy, the rows beside it. */
function ChallengeTable({ table, mine, right }: { table: Result[]; mine: Result | null; right: number }) {
  const position = mine ? table.indexOf(mine) + 1 : null;
  const top = table.slice(0, 10);
  const rows = mine && !top.includes(mine) ? [...top, mine] : top;
  const waiting = Math.max(0, WAITING - rows.length);
  return (
    <section>
      <span className="label text-[10px] lg:text-[11px]">This challenge{table.length > 1 ? ` · ${table.length} played` : ""}</span>
      <div className="mt-1.5 grid grid-cols-[96px_minmax(0,1fr)] border-2 border-navy lg:grid-cols-[120px_minmax(0,1fr)]">
        <div className="flex flex-col justify-between gap-2 bg-navy p-2.5 text-white lg:p-3">
          <span className="label text-[10px] text-teal-light lg:text-[11px]">Your place</span>
          <span className="font-display text-[52px] leading-[0.85] uppercase lg:text-[64px]">{position ? ordinal(position) : "–"}</span>
          <span className="label text-[10px] lg:text-[11px]">Of {Math.max(table.length, 1)}</span>
        </div>
        <ol className="min-w-0 px-3 py-2 lg:px-3.5 lg:py-2.5">
          {rows.map((r, i) => (
            <li
              key={i}
              className={`flex justify-between gap-2 py-1 lg:py-[5px] ${r.mine ? "-mx-1.5 bg-mist px-1.5 font-semibold lg:-mx-2 lg:px-2" : "border-b border-track"}`}
            >
              <span className="min-w-0 truncate">
                <b className="font-display">{table.indexOf(r) + 1}</b>&nbsp; {r.mine ? "You" : r.name}{" "}
                {r.setter && <span className="text-xs font-normal text-slate lg:text-[13px]">set it</span>}
              </span>
              <b className="font-display tabular-nums">{r.right}</b>
            </li>
          ))}
          {!rows.length && (
            <li className="-mx-1.5 flex justify-between bg-mist px-1.5 py-1 font-semibold lg:-mx-2 lg:px-2">
              <span>
                <b className="font-display">1</b>&nbsp; You
              </span>
              <b className="font-display tabular-nums">{right}</b>
            </li>
          )}
          {Array.from({ length: rows.length ? waiting : WAITING - 1 }, (_, i) => (
            <li key={`wait-${i}`} className="flex justify-between border-b border-dashed border-track py-1 text-slate lg:py-[5px]">
              <span>
                <b className="font-display">{Math.max(rows.length, 1) + i + 1}</b>&nbsp; Waiting on a mate
              </span>
              <b className="font-display">–</b>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/** The home page's ticket for sending the set on: the score to beat on the stub. */
function Ticket({ code, url, setSize, right, table, challenge }: { code: string; url: string; setSize: number; right: number; table: Result[]; challenge: boolean }) {
  const beat = toBeat(table, right);
  return (
    <section className="grid rotate-[0.8deg] grid-cols-[minmax(0,1fr)_96px] border-[3px] border-navy bg-white shadow-[5px_5px_0_var(--color-navy)] lg:grid-cols-[minmax(0,1fr)_120px] lg:shadow-[7px_7px_0_var(--color-navy)]">
      <div className="min-w-0 py-3 pr-3 pl-3.5 lg:py-3.5 lg:pr-3.5 lg:pl-4.5">
        <div className="label flex justify-between gap-2 text-[10px] lg:text-[11px]">
          <span>Admit one · Challenge</span>
          <span className="hidden text-royal min-[380px]:inline">{setSize} players</span>
        </div>
        <h2 className="mt-1 mb-1.5 font-display text-[34px] leading-[0.9] uppercase lg:mt-1.5 lg:mb-2 lg:text-[40px]">
          {challenge ? (
            <>
              Pass it <span className="sash-mark">on</span>
            </>
          ) : (
            <>
              Settle <span className="sash-mark">it</span>
            </>
          )}
        </h2>
        <p className="mb-3 text-[13px] lg:text-[15px]">
          {challenge
            ? `Same link, same ${setSize} players. Whoever plays next has to beat ${beat.right}.`
            : `Your mates get the same ${setSize} players in the same order, one go each.`}
        </p>
        <div className="mr-1.5">
          <ChallengeButton
            url={url}
            text={`Think you know ball? Beat ${beat.right} in 60 seconds of Higher or Lower on iKnowBall.`}
            label={challenge ? "Pass it on" : "Send it"}
            code={code}
          />
        </div>
      </div>
      <div className="flex flex-col items-center justify-between gap-2 border-l-[3px] border-dashed border-navy bg-teal px-1.5 py-3 text-navy lg:px-2 lg:py-4">
        <span className="label text-[9px] lg:text-[10px]">To beat</span>
        <span className="font-display text-[60px] leading-[0.85] tabular-nums lg:text-[76px]">{beat.right}</span>
        <span className="max-w-full truncate bg-navy px-1.5 py-0.5 font-display text-[13px] tracking-[0.08em] text-white uppercase lg:text-[15px]">{beat.name}</span>
      </div>
    </section>
  );
}
