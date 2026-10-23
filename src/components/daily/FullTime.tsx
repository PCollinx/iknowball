import Link from "next/link";
import { ClubPicker } from "@/components/profile/ClubPicker";
import { RatingBadge } from "@/components/profile/RatingBadge";
import { scoreInk } from "@/lib/profile/rating";
import type { Club } from "@/lib/profile/club";
import { gameDateClosesAt } from "@/lib/time";
import type { OrderReveal, RecallReveal, TableRow } from "@/lib/daily/data";
import { halfRating } from "@/lib/daily/score";
import { clock } from "./clock";
import { headlineFixture } from "./fixture";
import { Masthead, shortDate } from "./Masthead";
import { NextDaily } from "./NextDaily";
import { replayToday, switchTestRounds } from "@/app/(site)/daily/actions";
import { Pitch } from "./InPlay";
import { fullTimeLineup } from "./lineup";
import { ShareButtons } from "./ShareButtons";
import { ShareCard } from "./ShareCard";
import { FORMAT_NAME, ordinal } from "./formats";
import { shareCardData } from "./share";
import { ShirtBack, shirtName, type Kit } from "./ShirtBack";

// Full time (step 3 of docs/redesign-plan.md, Collins's mix of 22 Oct 2026):
// the match report's headline, score, line and ratings; the scoreboard's 1st
// half squad on the pitch; the album's 2nd half stickers, today's table and
// the club question; the share card; then Clash, your shirt and the next
// Daily. Phone is one column in that order; desktop puts the report and the
// halves on the left, the card and what's next on the right.

type Props = {
  issue: number;
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
  /** Your overall rating out of 10, today included. */
  rating: number | null;
  /** Previews and local runs, where today's Daily can be replayed. */
  testSite?: boolean;
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
              Full <span className="sash-mark">time</span>
            </h1>
            {/* One even band: (desktop) the headline | the score in its rating colour | where it leaves you. */}
            <div className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] border-t-[3px] border-b-4 border-navy [border-bottom-style:double] lg:mt-2 lg:grid-cols-[auto_auto_minmax(0,1fr)]">
              <div className="hidden items-center border-r-2 border-track py-3.5 pr-6 lg:flex">
                <h1 className="font-display text-[84px] leading-[0.84] uppercase">
                  Full
                  <br />
                  <span className="sash-mark">time</span>
                </h1>
              </div>
              <div className="border-r-2 border-track py-3 pr-4 lg:px-6 lg:py-3.5">
                <DayScore points={points} />
                <span className="label mt-1.5 block lg:mt-2">Day score</span>
              </div>
              <div className="flex flex-col justify-center gap-2 py-3 pl-4 lg:gap-2.5 lg:pl-6">
                <span className="self-start bg-teal px-2 py-1 font-display text-[22px] leading-none text-white uppercase lg:px-2.5 lg:text-[26px]">
                  {position ? `${ordinal(position)} of ${players}` : "Early doors"}
                </span>
                <span className="label leading-relaxed text-navy/80">
                  {topPercent ? `Top ${topPercent}% today` : "First in today"}
                  {seconds !== null && (
                    <>
                      <br />
                      {clock(seconds)} used
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
            <h2 className="label mb-2 lg:hidden">Your ratings</h2>
            <div className="grid grid-cols-3 gap-2 lg:gap-3.5">
              {recall && <RatingSticker n={halfRating(1, recall.score)} title="1st half" note={`${FORMAT_NAME[recall.daily.format]} ${found}/${total}`} tilt="-rotate-1" />}
              {order && (
                <RatingSticker
                  n={halfRating(2, order.score)}
                  title="2nd half"
                  note={`${FORMAT_NAME[order.daily.format]} ${order.correct}/${order.slots.length}`}
                  tilt="rotate-1"
                />
              )}
              <RatingSticker n={rating} title="Overall" note="Last 30 days" tilt="-rotate-[0.6deg]" dark />
            </div>
          </section>

          {recall && <Squad recall={recall} kit={kit} />}
          {order && <SecondHalf order={order} />}

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

        <div className="contents lg:sticky lg:top-4 lg:block lg:pt-5">
          <aside className="order-3 mt-5 lg:mt-0">
            {card && (
              <div className="-rotate-1 shadow-[5px_5px_0_var(--color-navy)] lg:shadow-[7px_7px_0_var(--color-navy)]">
                <ShareCard {...card} />
              </div>
            )}
            <ShareButtons text={shareText} image={card ? { url: "/daily/card", name: `iknowball-daily-${String(issue).padStart(3, "0")}.png` } : null} />
          </aside>

          <TodaysTable top={props.top} me={props.me} position={position} players={players} />

          <section className="order-8 mt-5 grid gap-2.5 lg:grid-cols-2 lg:gap-3">
            <Link href="/clash" className="btn-white btn-press group grid grid-cols-[minmax(0,1fr)_74px] lg:grid-cols-1">
              <span className="px-3 py-2.5">
                <span className="block font-display text-[26px] leading-[0.9] uppercase lg:text-[24px]">
                  Try a <span className="sash-mark">sprint</span>
                </span>
                <span className="block text-[13px] text-navy/80">60 seconds of Higher or Lower in Clash.</span>
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
              className="border-2 border-navy bg-teal px-2 text-[30px] text-white shadow-[3px_3px_0_var(--color-navy)] lg:text-[32px]"
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

function RatingSticker({ n, title, note, tilt, dark = false }: { n: number | null; title: string; note: string; tilt: string; dark?: boolean }) {
  return (
    <div
      className={`grid justify-items-center gap-1 border-[2.5px] border-navy p-2 shadow-[3px_3px_0_var(--color-navy)] lg:flex lg:items-center lg:gap-3 lg:px-3 lg:py-2.5 lg:shadow-[4px_4px_0_var(--color-navy)] ${tilt} ${dark ? "bg-navy text-white" : "bg-white"}`}
    >
      <RatingBadge rating={n} className={`w-[46px] shrink-0 text-[22px] lg:w-[52px] lg:text-2xl ${dark ? "border-2 border-white" : ""}`} />
      <span className="grid justify-items-center gap-1 lg:justify-items-start">
        <span className="font-display text-[15px] leading-none uppercase lg:text-xl">{title}</span>
        <span className={`label text-center text-[9px] lg:text-left lg:text-[11px] ${dark ? "text-white/80" : "text-navy/80"}`}>{note}</span>
      </span>
    </div>
  );
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

const TILTS = ["-rotate-[1.5deg]", "rotate-1", "-rotate-1", "rotate-[1.5deg]", "-rotate-[0.5deg]"];

/** An Era picks question is "Dennis Bergkamp at Arsenal": the player and the club. */
function eraParts(question: string | null): { player: string; club: string | null } {
  const q = question ?? "";
  const at = q.lastIndexOf(" at ");
  return at > 0 ? { player: q.slice(0, at), club: q.slice(at + 4) } : { player: q, club: null };
}

/** The name on a sticker: all but the first name ("Van Persie"), or the one name. */
function stickerName(name: string): string {
  const words = name.trim().split(/\s+/);
  return words.length > 1 ? words.slice(1).join(" ") : name;
}

/** Part 2's right answer as a row of stickers, wrong ones in red. */
function SecondHalf({ order }: { order: OrderReveal }) {
  const era = order.daily.format === "era";
  const club = era ? eraParts(order.slots[0]?.note ?? null).club : null;
  return (
    <section className="order-6 mt-6">
      <div className="flex items-baseline justify-between gap-3 border-b-2 border-navy pb-1.5">
        <h2 className="label min-w-0 truncate">
          2nd half · {FORMAT_NAME[order.daily.format]}
          {club && ` · at ${club}`}
        </h2>
        <span className="label text-royal">
          {order.correct}/{order.slots.length}
        </span>
      </div>
      <ol className={`mt-3 grid gap-2 lg:gap-2.5 ${era ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-5"}`}>
        {order.slots.map((s, i) => (
          <li
            key={i}
            className={`min-w-0 border-2 px-1 py-1.5 text-center ${TILTS[i % TILTS.length]} ${s.right ? "border-royal shadow-[2px_2px_0_var(--color-royal)]" : "border-red-card shadow-[2px_2px_0_var(--color-red-card)]"}`}
          >
            <span className={`block font-display leading-[0.9] ${s.right ? "text-royal" : "text-red-card"} ${era ? "text-lg lg:text-xl" : "text-xl lg:text-[28px]"}`}>
              {era ? s.correct : (s.note ?? i + 1)}
            </span>
            <span className="mt-1 block truncate font-display text-xs uppercase lg:text-base">{era ? stickerName(eraParts(s.note).player) : shirtName(s.correct)}</span>
          </li>
        ))}
      </ol>
      <SecondHalfNote order={order} />
    </section>
  );
}

/** What went wrong in Part 2, in a line. */
function SecondHalfNote({ order }: { order: OrderReveal }) {
  const wrong = order.slots.filter((s) => !s.right);
  if (!wrong.length) return <p className="mt-2.5 text-[13px] font-semibold text-royal">Every one in its place.</p>;
  let line: string;
  if (order.daily.format === "era") {
    line = wrong.map((s) => `${stickerName(eraParts(s.note).player)}: you said ${s.placed || "nothing"}`).join(" · ");
  } else if (wrong.length === 2 && wrong[0].placed === wrong[1].correct && wrong[1].placed === wrong[0].correct) {
    line = `You swapped ${shirtName(wrong[0].correct)} and ${shirtName(wrong[1].correct)}.`;
  } else {
    line = wrong.map((s) => `${s.placed ? shirtName(s.placed) : "Nobody"} where ${shirtName(s.correct)} goes`).join(" · ");
  }
  return <p className="mt-2.5 text-[13px] font-semibold text-red-card">{line}</p>;
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
