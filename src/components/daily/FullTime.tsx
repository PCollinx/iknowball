import Link from "next/link";
import { MiniThree } from "@/components/clash/YourThree";
import { ClubPicker } from "@/components/profile/ClubPicker";
import { SeasonTicket } from "@/components/pwa/SeasonTicket";
import { WhistleStrip } from "@/components/push/WhistleStrip";
import { APP_ICON_SRC } from "@/lib/og/logo";
import { RatingBadge } from "@/components/profile/RatingBadge";
import { SheetValue, TeamSheet, type SheetRow } from "@/components/sheet/TeamSheet";
import { scoreInk } from "@/lib/profile/rating";
import type { Club } from "@/lib/profile/club";
import { gameDate, gameDateClosesAt, seasonLabel, seasonOf } from "@/lib/time";
import type { OrderReveal, RecallReveal, TableRow } from "@/lib/daily/data";
import { halfRating } from "@/lib/daily/score";
import { handoffHeading, STATS, type Stat } from "@/lib/clash/rules";
import { duration } from "./clock";
import { headlineFixture } from "./fixture";
import { Masthead, shortDate } from "./Masthead";
import { NextDaily } from "./NextDaily";
import { replayToday, switchTestRounds } from "@/app/(site)/daily/actions";
import { Pitch } from "./InPlay";
import { fullTimeLineup } from "./lineup";
import { ShareButtons } from "./ShareButtons";
import { ExtraTime } from "./ExtraTime";
import { ShareCard } from "./ShareCard";
import { FORMAT_NAME, ordinal } from "./formats";
import type { PathClub } from "./KitTrail";
import { shareCardData } from "./share";
import { ShirtBack, shirtName, type Kit } from "./ShirtBack";

// Full time (step 3 of docs/launch-plan.md, Collins's mix of 22 Oct 2026):
// the match report's headline, score, line and ratings; the scoreboard's 1st
// half squad on the pitch; the album's 2nd half stickers, today's table and
// the club question; the share card; then Clash, your shirt and the next
// Daily. Phone is one column in that order; desktop puts the report and the
// halves on the left, the card and what's next on the right.

type Props = {
  issue: number;
  /** Your three Clash sprints this week (best first) and today's stat, for the hand-off to Clash. */
  clash: { three: number[]; stat: Stat };
  playDate: string;
  recall: RecallReveal | null;
  order: OrderReveal | null;
  points: number;
  topPercent: number | null;
  /** Your place in today's table, and how many are in it. */
  position: number | null;
  players: number;
  /** Today's top three and your row. */
  top: TableRow[];
  me: TableRow | null;
  siteUrl: string;
  /** The clubs to pick from when "Who do you support?" hasn't been asked yet. */
  clubChoices: Club[] | null;
  /** The few shown first in that picker: today's clubs, then the big ones. */
  featuredClubs: Club[];
  /** Your club, when it's in today's fixture: tagged on the share card. */
  fanOf: string | null;
  /** The fixture's kit for the answer shirts. */
  kit: Kit | null;
  /** Your own shirt: your club's kit, or the neutral one. */
  myKit: Kit;
  /** Kits of the clubs in a career path In Order, by club name. */
  orderKits?: Record<string, PathClub>;
  /** Your overall rating out of 10, today included. */
  rating: number | null;
  /** Previews and local runs, where today's Daily can be replayed. */
  testSite?: boolean;
  /** Playing without an account: the iPhone steps say to save the shirt first. */
  guest: boolean;
};

const WORDS = ["None", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"];

/** The match report's line: how many got away and the first of them. */
export function banter(recall: RecallReveal): string {
  const short = recall.missed.length;
  if (short === 0) return "Clean sweep. Unreal ball knowledge.";
  return `${WORDS[short] ?? short} got away. ${shirtName(recall.missed[0].text)} was right there.`;
}

export function FullTime(props: Props) {
  const { issue, playDate, recall, order, points, topPercent, position, players, siteUrl, kit, rating, testSite = false } = props;
  const found = recall?.found.length ?? 0;
  const total = recall ? found + recall.missed.length : 0;
  const seconds = props.me?.seconds ?? null;
  const card = recall
    ? shareCardData({ issue, playDate, recall, order, points, topPercent, siteUrl, fanOf: props.fanOf, kit, rating, seconds })
    : null;
  const shareText = [
    `iKnowBall · The Daily No. ${String(issue).padStart(3, "0")}`,
    recall?.daily.title ?? "",
    `${points}/100`,
    recall ? `${"■".repeat(found)}${"□".repeat(total - found)} ${found}/${total}` : "",
    order ? `${FORMAT_NAME[order.daily.format]} ${order.correct}/${order.slots.length}` : "",
    `Beat me: ${siteUrl.replace(/\/$/, "")}/daily`,
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <main className="mx-auto w-full max-w-[560px] flex-1 px-4 pb-10 lg:max-w-[1280px] lg:px-8">
      <Masthead issue={issue} right={shortDate(playDate)} />

      {/* Phone: one column, ordered with `order`. Desktop: two columns. */}
      <div className="flex flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_480px] lg:items-start lg:gap-x-12">
        <div className="contents lg:block">
          <section className="order-1 pt-3 lg:pt-5">
            <span className="label text-royal">Match report · {recall ? headlineFixture(recall.daily.title) : "The Daily"}</span>
            <h1 className="mt-1 font-display text-[56px] leading-[0.86] uppercase lg:hidden">
              Full time
            </h1>
            {/* One even band: (desktop) the headline | the score in its rating colour | where it leaves you. */}
            <div className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] border-t-[3px] border-b-4 border-navy [border-bottom-style:double] lg:mt-2 lg:grid-cols-[auto_auto_minmax(0,1fr)]">
              <div className="hidden items-center border-r-2 border-track py-3.5 pr-6 lg:flex">
                <h1 className="font-display text-[84px] leading-[0.84] uppercase">
                  Full
                  <br />
                  time
                </h1>
              </div>
              <div className="border-r-2 border-track py-3 pr-4 lg:px-6 lg:py-3.5">
                <DayScore points={points} />
                <span className="label mt-1.5 block lg:mt-2">Day score</span>
              </div>
              <div className="flex flex-col justify-center gap-2 py-3 pl-4 lg:gap-2.5 lg:pl-6">
                <span className="self-start bg-navy px-2 py-1 font-display text-[22px] leading-none text-white uppercase lg:px-2.5 lg:text-[26px]">
                  {position ? `${ordinal(position)} of ${players}` : "Early doors"}
                </span>
                <span className="label leading-relaxed text-navy/80">
                  {topPercent ? `Top ${topPercent}% today` : "First in today"}
                  {seconds !== null && (
                    <>
                      <br />
                      {duration(seconds)} used
                    </>
                  )}
                </span>
              </div>
            </div>
            {recall && (
              <p className="mt-2.5 font-display text-[20px] leading-none uppercase lg:mt-3 lg:text-2xl">
                <span className="text-red-card">“</span>
                {banterParts(recall)}
                <span className="text-red-card">”</span>
              </p>
            )}
          </section>

          <section className="order-2 pt-3 lg:pt-4">
            <TeamSheet
              name="Player ratings"
              tag="Out of 10"
              rows={[
                ...(recall
                  ? [{ title: "1st half", text: `${FORMAT_NAME[recall.daily.format]} ${found}/${total}`, value: <SheetBadge rating={halfRating(1, recall.score)} /> }]
                  : []),
                ...(order
                  ? [{ title: "2nd half", text: `${FORMAT_NAME[order.daily.format]} ${order.correct}/${order.slots.length}`, value: <SheetBadge rating={halfRating(2, order.score)} /> }]
                  : []),
                { title: "Overall", text: "Last 30 days", value: <SheetBadge rating={rating} dark />, dark: true },
              ]}
            />
          </section>

          {recall && <Squad recall={recall} kit={kit} />}
          {order && <SecondHalf order={order} kits={props.orderKits} />}

          {props.clubChoices && (
            <section className="order-4 mt-6 border-y-4 border-double border-navy py-3.5 lg:mt-7 lg:py-4">
              <h2 className="font-display text-[40px] leading-[0.9] uppercase lg:text-[48px]">
                Who do you <span className="sash-mark">support?</span>
              </h2>
              <p className="mt-1.5 text-sm leading-snug lg:text-[15px]">
                Your club dresses your shirt and puts you in the fanbase table. It never changes your questions or your score. You can switch once a
                season.
              </p>
              <ClubPicker clubs={props.clubChoices} current={null} mode="prompt" featured={props.featuredClubs} />
            </section>
          )}
        </div>

        <div className="contents lg:sticky lg:top-[88px] lg:block lg:pt-5">
          <aside className="order-3 mt-5 lg:mt-0">
            {card && (
              <div className="-rotate-1 shadow-[5px_5px_0_var(--color-navy)] lg:shadow-[7px_7px_0_var(--color-navy)]">
                <ShareCard {...card} />
              </div>
            )}
            <ShareButtons text={shareText} image={card ? { url: "/daily/card", name: `iknowball-daily-${String(issue).padStart(3, "0")}.png` } : null} />
            {/* Not on a first full time, which asks "Who do you support?" instead. */}
            {!props.clubChoices && <SeasonTicket guest={props.guest} icon={APP_ICON_SRC} season={seasonLabel(seasonOf(gameDate()))} />}
            {!props.clubChoices && <WhistleStrip guest={props.guest} className="mt-6" />}
          </aside>

          <TodaysTable top={props.top} me={props.me} position={position} players={players} />

          <section className="order-8 mt-5 grid gap-2.5 lg:grid-cols-2 lg:gap-3">
            {/* The hand-off to Clash (Collins, 31 Oct 2026): your three and what they still need. */}
            <Link href="/clash" className="btn-white btn-press group grid grid-cols-[minmax(0,1fr)_74px] lg:grid-cols-1">
              <span className="grid gap-1.5 px-3 py-2.5">
                <span className="block font-display text-[26px] leading-[0.9] uppercase lg:text-[24px]">{handoffHeading(props.clash.three)}</span>
                <MiniThree three={props.clash.three} />
                <span className="block text-[13px] text-navy/80">
                  Today&apos;s stat is <b>{STATS[props.clash.stat].short.toLowerCase()}</b>. Try a sprint →
                </span>
              </span>
              <span className="grid place-items-center border-l-[2.5px] border-dashed border-navy bg-navy font-display text-xl text-sky uppercase lg:hidden">
                60s
              </span>
            </Link>
            <Link href="/profile" className="group grid grid-cols-[48px_minmax(0,1fr)_auto] items-center gap-2.5 bg-navy px-3 py-2 text-white">
              <span className="block -rotate-[4deg] transition-transform duration-150 group-hover:-translate-y-0.5">
                <ShirtBack kit={props.myKit} lettering="tag" />
              </span>
              <span className="min-w-0">
                <span className="block font-display text-2xl leading-[0.9] uppercase">Your shirt</span>
                <span className="block text-xs text-white/80">Rating, streak, this week</span>
              </span>
              <RatingBadge rating={rating} className="w-10 border-2 border-white text-lg" />
            </Link>
          </section>

          <div className="order-9 mt-5 flex items-center justify-between border-t-2 border-navy pt-3">
            <span className="label">Next Daily in</span>
            <NextDaily
              closesAt={gameDateClosesAt(playDate).toISOString()}
              className="border-2 border-navy bg-white px-2 text-[30px] text-navy shadow-[3px_3px_0_var(--color-navy)] lg:text-[32px]"
            />
          </div>

          {testSite && (
            <div className="order-10 mt-5 grid gap-2">
              <form action={replayToday} className="flex items-center justify-between gap-3 border-2 border-dashed border-red-card p-3">
                <span className="text-sm font-semibold text-red-card">Test site only. Live players get one try.</span>
                <button type="submit" className="shrink-0 bg-red-card px-4 py-1.5 font-display text-lg text-white uppercase">
                  Play it again
                </button>
              </form>
              <form action={switchTestRounds} className="grid gap-2 border-2 border-dashed border-red-card p-3">
                <span className="text-sm font-semibold text-red-card">
                  Test site only. Swap today for the sample Daily (clears everyone&apos;s tries today):
                </span>
                <span className="flex flex-wrap gap-2">
                  <button type="submit" name="kind" value="typed" className="bg-red-card px-3 py-1.5 font-display text-base text-white uppercase">
                    Free Recall + In Order
                  </button>
                  <button type="submit" name="kind" value="picks" className="bg-red-card px-3 py-1.5 font-display text-base text-white uppercase">
                    Rapid + Era picks
                  </button>
                </span>
              </form>
            </div>
          )}
        </div>
      </div>
      <ExtraTime three={props.clash.three} stat={props.clash.stat} />
    </main>
  );
}

/** The line with the first one who got away in red. */
function banterParts(recall: RecallReveal) {
  const line = banter(recall);
  const name = recall.missed.length ? shirtName(recall.missed[0].text) : null;
  if (!name) return line;
  const at = line.lastIndexOf(name);
  return (
    <>
      {line.slice(0, at)}
      <span className="text-red-card">{name}</span>
      {line.slice(at + name.length)}
    </>
  );
}

/** The day score in its rating's colour with a hard navy shadow; yellow gets a navy edge. */
function DayScore({ points }: { points: number }) {
  const { ink, edge } = scoreInk(points);
  return (
    <span
      className="block font-display text-[96px] leading-[0.8] tabular-nums [text-shadow:3px_3px_0_var(--color-navy)] lg:text-[120px] lg:[text-shadow:4px_4px_0_var(--color-navy)]"
      style={{ color: ink, WebkitTextStroke: edge ? "1.5px var(--color-navy)" : undefined }}
    >
      {points}
      <span className="text-[32px] text-navy [-webkit-text-stroke:0] [text-shadow:2px_2px_0_var(--color-track)] lg:text-[40px] lg:[text-shadow:3px_3px_0_var(--color-track)]">/100</span>
    </span>
  );
}

/** A rating on the team sheet: square, with a navy edge (white on the dark row). */
function SheetBadge({ rating, dark = false }: { rating: number | null; dark?: boolean }) {
  return <RatingBadge rating={rating} square className={`size-10 border-2 text-[19px] lg:size-12 lg:text-[22px] ${dark ? "border-white" : ""}`} />;
}

/** Part 1's squad (22 Oct 2026): found players on the pitch by position, then
 * the missed ones in the gaps with an ×; whoever doesn't fit goes on the bench
 * (found) or under "Got away" (missed). Names sit on the shirts' nameplates. */
function Squad({ recall, kit }: { recall: RecallReveal; kit: Kit | null }) {
  const found = recall.found.length;
  const team = fullTimeLineup(recall.found, recall.missed);
  return (
    <section className="order-5 mt-6" aria-label={`1st half squad: ${found} found, ${recall.missed.length} got away`}>
      <div className="flex items-baseline justify-between border-b-2 border-navy pb-1.5">
        <h2 className="label">1st half · the squad</h2>
        <span className="label text-royal">
          {found} found · <span className="text-red-card">{recall.missed.length} got away</span>
        </span>
      </div>
      <div className="mt-2.5 lg:grid lg:grid-cols-[minmax(0,1fr)_170px] lg:gap-4">
        <Pitch half="attack" className="aspect-[358/400] lg:aspect-[4/3]">
          {team.pitch.map((spot) => (
            <div key={`${spot.x}-${spot.y}`} className="absolute w-[19cqw] -translate-1/2 lg:w-[14cqw]" style={{ left: `${spot.x}%`, top: `${spot.y}%` }}>
              {!spot.player ? (
                <ShirtBack state="empty" />
              ) : spot.missed ? (
                <ShirtBack name={shirtName(spot.player.text)} num="×" state="miss" />
              ) : (
                <ShirtBack kit={kit ?? undefined} name={shirtName(spot.player.text)} num={spot.player.num} />
              )}
            </div>
          ))}
        </Pitch>
        <div className="lg:content-start">
          {team.bench.length > 0 && (
            <OffPitch label="Bench">
              {team.bench.map((p) => (
                <ShirtBack key={p.id} kit={kit ?? undefined} name={shirtName(p.text)} num={p.num} />
              ))}
            </OffPitch>
          )}
          {team.away.length > 0 && (
            <OffPitch label="Got away" miss>
              {team.away.map((m) => (
                <ShirtBack key={m.id} name={shirtName(m.text)} num="×" state="miss" />
              ))}
            </OffPitch>
          )}
        </div>
      </div>
    </section>
  );
}

/** A labelled row of shirts under the pitch (beside it on desktop). */
function OffPitch({ label, miss = false, children }: { label: string; miss?: boolean; children: React.ReactNode }) {
  return (
    <div className="mt-2.5 grid grid-cols-[62px_minmax(0,1fr)] items-center gap-2 lg:mt-0 lg:mb-3 lg:grid-cols-1">
      <span className={`label text-[10px] lg:text-xs ${miss ? "text-red-card" : "text-navy/80"}`}>{label}</span>
      <div className="grid grid-cols-5 gap-x-2 gap-y-1.5 lg:grid-cols-2">{children}</div>
    </div>
  );
}

/** An Era picks question is "Dennis Bergkamp at Arsenal": the player and the club. */
function eraParts(question: string | null): { player: string; club: string | null } {
  const q = question ?? "";
  const at = q.lastIndexOf(" at ");
  return at > 0 ? { player: q.slice(0, at), club: q.slice(at + 4) } : { player: q, club: null };
}

/** The name on a sticker: all but the first name ("Van Persie"), or the one name.
 * A list of surnames ("Henry, Bergkamp and Vieira") is already short. */
function stickerName(name: string): string {
  if (name.includes(",")) return name;
  const words = name.trim().split(/\s+/);
  return words.length > 1 ? words.slice(1).join(" ") : name;
}

/** Part 2 on a team sheet (Collins, 9 Nov 2026, option A of
 * https://claude.ai/artifact/W8WzfBiMFE3F6Lq31H8kec): a row a question with a
 * dotted leader to the answer, misses on a red rule with what you said, and a
 * navy row summing the half up. */
function SecondHalf({ order, kits }: { order: OrderReveal; kits?: Record<string, PathClub> }) {
  const era = order.daily.format === "era";
  // A career path's answers are clubs: each wears its shirt and keeps its whole name.
  const career = order.daily.template === "career-path";
  const nameOf = career ? (name: string) => name : shirtName;
  const yours = order.slots.map((s) => s.placed);
  const rows: SheetRow[] = order.slots.map((s, i) => {
    if (era) {
      const { player, club } = eraParts(s.note);
      return {
        title: stickerName(player),
        value: <SheetAnswer right={s.right}>{period(s.correct)}</SheetAnswer>,
        text: s.right ? club : <span className="font-semibold text-red-card">{[club, `You said ${s.placed ? period(s.placed) : "nothing"}`].filter(Boolean).join(" · ")}</span>,
        warn: !s.right,
      };
    }
    const at = yours.indexOf(s.correct);
    return {
      title: (
        <span className="inline-flex items-center gap-2">
          {career && (
            <span className="w-7 shrink-0 lg:w-8">
              <ShirtBack kit={kits?.[s.correct]?.kit} />
            </span>
          )}
          {i + 1} · {nameOf(s.correct)}
        </span>
      ),
      value: <SheetAnswer right={s.right}>{s.note ?? ""}</SheetAnswer>,
      text: s.right ? undefined : (
        <span className="font-semibold text-red-card">{at >= 0 ? `You had ${career ? "it" : "him"} ${ordinal(at + 1)}` : "You didn't place him"}</span>
      ),
      warn: !s.right,
    };
  });
  rows.push({ title: secondHalfLine(order, nameOf), value: <SheetValue className="text-teal-light">{order.correct}/{order.slots.length}</SheetValue>, dark: true });
  return (
    <section className="order-6 mt-6">
      <TeamSheet name={`2nd half · ${FORMAT_NAME[order.daily.format]}`} tag={`${order.correct}/${order.slots.length}`} rows={rows} />
    </section>
  );
}

/** An answer at the end of the leader, with a square ✓ or ✕ chip. */
function SheetAnswer({ right, children }: { right: boolean; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-2">
      <SheetValue className={`text-[20px] whitespace-nowrap lg:text-[24px] ${right ? "text-royal" : ""}`}>{children}</SheetValue>
      <span
        aria-label={right ? "Right" : "Wrong"}
        className={`grid size-8 place-items-center border-2 font-display text-lg text-white lg:size-9 ${right ? "border-royal bg-royal" : "border-red-card bg-red-card"}`}
      >
        {right ? "✓" : "✕"}
      </span>
    </span>
  );
}

/** An Era picks period as the tickets print it: "1995–2006" reads "1995 → 2006", an open one "2019 → now". */
function period(choice: string): string {
  const [from, to] = choice.split("–");
  return to === undefined ? choice : `${from} → ${to || "now"}`;
}

/** The half in a line, on the sheet's navy row. */
function secondHalfLine(order: OrderReveal, nameOf: (name: string) => string): string {
  const wrong = order.slots.filter((s) => !s.right);
  if (!wrong.length) return "Every one in its place";
  if (order.daily.format === "era") return wrong.length === 1 ? "One got away" : `${wrong.length} got away`;
  if (wrong.length === 2 && wrong[0].placed === wrong[1].correct && wrong[1].placed === wrong[0].correct) {
    return `You swapped ${nameOf(wrong[0].correct)} and ${nameOf(wrong[1].correct)}`;
  }
  return `${wrong.length} out of place`;
}

/** Today's table as the home page's scoreboard: your place, the top three and you. */
function TodaysTable({ top, me, position, players }: { top: TableRow[]; me: TableRow | null; position: number | null; players: number }) {
  const rows = me && !top.some((r) => r.userId === me.userId) ? [...top, me] : top;
  return (
    <Link href="/daily/table" className="order-7 mt-6 block border-[2.5px] border-navy bg-navy text-white shadow-[5px_5px_0_var(--color-sky)] lg:mt-6">
      <span className="flex justify-between border-b-[1.5px] border-[#3a4466] px-3 py-2">
        <span className="label text-teal-light">Today&apos;s table</span>
        <span className="label">{players} played →</span>
      </span>
      <span className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3.5 px-3 pt-2 pb-2.5">
        <span className="font-display text-[70px] leading-[0.85] text-teal-light tabular-nums">
          {position ?? "–"}
          {position && <span className="text-[28px]">{ordinal(position).replace(String(position), "")}</span>}
        </span>
        <span className="grid gap-0.5 text-[13px]">
          {rows.map((r) => (
            <span key={r.userId} className={`flex justify-between gap-2 ${r.userId === me?.userId ? "-mx-1.5 bg-slate px-1.5" : ""}`}>
              <span className="truncate">
                {r.position} · {r.userId === me?.userId ? "You" : r.name}
              </span>
              <span className="font-display text-base tabular-nums">{r.score}</span>
            </span>
          ))}
        </span>
      </span>
    </Link>
  );
}
