import { startSprint } from "@/app/(site)/clash/actions";
import { SubmitButton } from "@/components/daily/SubmitButton";
import { ordinal } from "@/components/daily/formats";
import { MatchStats, statRow } from "@/components/fulltime/MatchStats";
import { TellMe } from "@/components/push/TellMe";
import type { Result } from "@/lib/clash/data";
import { sprintLine, type Item } from "@/lib/clash/rules";
import { ResultBoard } from "./Board";
import { ChallengeButton } from "./ChallengeButton";
import { ClashMasthead } from "./Masthead";
import { calledLine, cardMessage, costlyCalls, outcomeOf, toBeat, type Side, verdictLine } from "./result";

// Full time, option B (Collins, 14 Nov 2026, from
// https://claude.ai/artifact/SZra89xUEceo8bAE28aHcH): the screen splits into
// your score against the other side's (your best earlier this week on a solo
// sprint, the setter on a mate's challenge), what it did to your three, match
// stats, the calls that cost you with both numbers, then the ticket to send
// it on and a new sprint. Phone is one column; desktop puts the result left
// and what's next right. The result image (/clash/{code}/card) is its own design.

type Props = {
  code: string;
  statLabel: string;
  setSize: number;
  right: number;
  kicks: string;
  bestRun: number;
  /** The set's players in order, numbers included: the calls that cost you. */
  items: Item[];
  /** Everyone's go at this set, best first. */
  table: Result[];
  siteUrl: string;
  /** Your best sprint this week before this one, if any. */
  before: Omit<Side, "name"> | null;
  /** What this sprint did to your three this week. */
  week: { three: number[]; added: number; replaced: number | null };
  /** On a rematch you started: the mate it's for. */
  rival?: string | null;
};

export function ClashFullTime({ code, statLabel, setSize, right, kicks, bestRun, items, table, siteUrl, before, week, rival = null }: Props) {
  const mine = table.find((r) => r.mine) ?? null;
  const setter = table.find((r) => r.setter && !r.mine) ?? null;
  const missed = kicks.length - right;
  const url = `${siteUrl.replace(/\/$/, "")}/clash/${code}`;
  const other: Side | null = setter ?? (before ? { name: "Your best", ...before } : null);
  const calls = costlyCalls(items, kicks);
  const most = Math.max(kicks.length, other?.kicks.length ?? 0, 1);
  // With nothing to compare against (the week's first sprint), their side reads "–".
  const row = (label: string, mine: number, theirs: (o: Side) => number) =>
    statRow(label, mine, other ? theirs(other) : 0, most, { theirs: other ? String(theirs(other)) : "–" });

  return (
    <main className="mx-auto w-full max-w-[560px] flex-1 px-4 pb-10 lg:max-w-[1180px] lg:px-12">
      <ClashMasthead left={setter ? "Clash · Challenge · Full time" : "Clash · Full time"} right={code} />
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_440px] lg:items-start lg:gap-14">
        <div className="min-w-0">
          <h1 className="sr-only">Full time</h1>
          <ResultBoard
            statLabel={statLabel}
            right={right}
            other={{ name: setter ? setter.name : "Your best this week", right: other ? other.right : null }}
            footer={`${calledLine(kicks.length, setSize)}.`}
          />
          <p className="mt-4 text-[15px] leading-snug lg:text-base">
            {setter && <>{verdictLine(setter, outcomeOf(right, setter.right))} </>}
            {sprintLine(right, week)}
          </p>

          <MatchStats
            className="mt-5 lg:mt-6"
            sides={["You", setter ? setter.name : "Your best"]}
            against="slate"
            rows={[
              row("Right", right, (o) => o.right),
              row("Missed", missed, (o) => o.kicks.length - o.right),
              row("Best run", bestRun, (o) => o.bestRun),
              row("Calls made", kicks.length, (o) => o.kicks.length),
            ]}
          />

          {calls.length > 0 && (
            <section className="mt-7" aria-label="The calls that cost you">
              <div className="flex items-baseline justify-between border-b-2 border-red-card pb-1.5">
                <h2 className="font-display text-2xl leading-none uppercase lg:text-[26px]">The calls that cost you</h2>
                <span className="label text-red-card">{missed} missed</span>
              </div>
              <ol>
                {calls.map((c, i) => (
                  <li key={i} className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 border-b border-track py-2">
                    <span className="min-w-0">
                      <span className="block truncate font-display text-[17px] leading-tight text-red-card uppercase lg:text-lg">{c.fewer.name}</span>
                      <span className="text-xs lg:text-[13px]">{c.fewer.value}</span>
                    </span>
                    <span className="label text-[9px] text-slate">v</span>
                    <span className="min-w-0 text-right">
                      <span className="block truncate font-display text-[17px] leading-tight uppercase lg:text-lg">{c.more.name}</span>
                      <span className="text-xs lg:text-[13px]">{c.more.value} · more</span>
                    </span>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>

        <aside className="mt-7 grid gap-6 lg:mt-0">
          <Ticket code={code} url={url} right={right} missed={missed} table={table} challenge={Boolean(setter)} rival={setter ? null : rival} />
          {/* Your own set: "Tell me when they play" (the whistle, option B). */}
          {!setter && <TellMe />}
          {(setter || table.length > 1) && <ChallengeTable table={table} mine={mine} />}
          <form action={startSprint}>
            <SubmitButton tone="navy" pendingText="Picking…">
              {setter ? "Your own sprint" : "New sprint"}
            </SubmitButton>
          </form>
        </aside>
      </div>
    </main>
  );
}

/** Everyone who played the set: your place on navy, the rows beside it. */
function ChallengeTable({ table, mine }: { table: Result[]; mine: Result | null }) {
  const position = mine ? table.indexOf(mine) + 1 : null;
  const top = table.slice(0, 10);
  const rows = mine && !top.includes(mine) ? [...top, mine] : top;
  return (
    <section>
      <span className="label text-[10px] lg:text-[11px]">This challenge · {table.length} played</span>
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
        </ol>
      </div>
    </section>
  );
}

/** The ticket for sending the set on, said plainly (Collins, 14 Nov 2026): the score to beat on the stub. */
function Ticket({ code, url, right, missed, table, challenge, rival }: { code: string; url: string; right: number; missed: number; table: Result[]; challenge: boolean; rival: string | null }) {
  const beat = toBeat(table, right);
  const whose = beat.name === "You" ? "your" : `${beat.name}'s`;
  const heading = challenge ? "Pass it on" : rival ? `Send it to ${rival}` : "Challenge a friend";
  const line = rival ? `New set, same stat. One go to beat your ${beat.right}.` : `Same players, same order. One go to beat ${whose} ${beat.right}.`;
  return (
    <section className="grid grid-cols-[minmax(0,1fr)_92px] border-[3px] border-navy bg-white shadow-[5px_5px_0_var(--color-navy)] lg:grid-cols-[minmax(0,1fr)_112px] lg:shadow-[7px_7px_0_var(--color-navy)]">
      <div className="min-w-0 py-3 pr-3 pl-3.5 lg:py-3.5 lg:pr-3.5 lg:pl-4.5">
        <h2 className="font-display text-[32px] leading-[0.9] uppercase lg:text-[38px]">{heading}</h2>
        <p className="mt-1.5 mb-3 text-[13px] lg:text-[15px]">{line}</p>
        <div className="mr-1.5">
          <ChallengeButton
            url={url}
            text={cardMessage({ right, missed, toBeat: beat.right })}
            label={challenge ? "Pass it on" : rival ? `Send to ${rival}` : "Send to a friend"}
            image={{ url: `/clash/${code}/card`, name: `iknowball-clash-${code}.png` }}
          />
        </div>
      </div>
      <div className="flex flex-col items-center justify-center gap-1 border-l-[3px] border-dashed border-navy bg-teal px-1.5 py-3 text-navy lg:px-2">
        <span className="label text-[9px] lg:text-[10px]">To beat</span>
        <span className="font-display text-[60px] leading-[0.85] tabular-nums lg:text-[76px]">{beat.right}</span>
      </div>
    </section>
  );
}
