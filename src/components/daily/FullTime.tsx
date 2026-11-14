import Link from "next/link";
import { ClubPicker } from "@/components/profile/ClubPicker";
import { SeasonTicket } from "@/components/pwa/SeasonTicket";
import { WhistleStrip } from "@/components/push/WhistleStrip";
import { APP_ICON_SRC } from "@/lib/og/logo";
import { SheetValue, TeamSheet, type SheetRow } from "@/components/sheet/TeamSheet";
import type { Club } from "@/lib/profile/club";
import { gameDate, gameDateClosesAt, seasonLabel, seasonOf } from "@/lib/time";
import type { OrderReveal, RecallReveal, TableRow } from "@/lib/daily/data";
import { PART_MAX } from "@/lib/daily/score";
import { MatchStats, statRow, type StatRow } from "@/components/fulltime/MatchStats";
import type { Stat } from "@/lib/clash/rules";
import { headlineFixture } from "./fixture";
import { Masthead, shortDate } from "./Masthead";
import { NextDaily } from "./NextDaily";
import { replayToday, switchTestRounds } from "@/app/(site)/daily/actions";
import { Pitch } from "./InPlay";
import { fullTimeLineup } from "./lineup";
import { ShareButtons } from "./ShareButtons";
import { ExtraTime } from "./ExtraTime";
import { FORMAT_NAME, ordinal } from "./formats";
import type { PathClub } from "./KitTrail";
import { shareCardData, shareMessage } from "./share";
import { ShirtBack, shirtName, type Kit } from "./ShirtBack";
import { Arrow, Check, Cross } from "@/components/icons/Icon";

// Full time, option B "You v the lost points" (Collins, 14 Nov 2026, from
// https://claude.ai/artifact/SZra89xUEceo8bAE28aHcH): the scoreline of points
// won against points lost, your place, match stats, the first half's players
// on the pitch with the misses off it, the second half as a VAR review, then
// the card to send, today's table and the next Daily, with Clash pinned to the
// foot (Extra time). Phone is one column in that order; desktop puts the
// score, stats and what's next left, the halves right.

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
  /** Each club in its own kit, for the share card. */
  fixtureKits: [Kit | undefined, Kit | undefined];
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
  const { issue, playDate, recall, order, points, topPercent, position, players, siteUrl, kit, testSite = false } = props;
  const card = recall
    ? shareCardData({ playDate, recall, order, points, siteUrl, name: props.me?.name ?? null, kits: props.fixtureKits })
    : null;
  const shareText = card ? shareMessage(card, siteUrl) : `Beat me: ${siteUrl.replace(/\/$/, "")}/daily`;

  return (
    <main className="mx-auto w-full max-w-[560px] flex-1 px-4 pb-10 lg:max-w-[1180px] lg:px-8">
      <Masthead issue={issue} right={shortDate(playDate)} />

      {/* Phone: one column, ordered with `order`. Desktop: the score and the stats left, the halves right. */}
      <div className="flex flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start lg:gap-x-12">
        <div className="contents lg:block">
          <section className="order-1 pt-3 lg:pt-5">
            <h1 className="sr-only">Full time</h1>
            <Scoreline title={recall ? headlineFixture(recall.daily.title) : "The Daily"} points={points} kit={props.myKit} />
            <p className="mt-4 text-[15px] leading-snug lg:text-base">
              {position ? `${ordinal(position)} of ${players}${topPercent ? `, top ${topPercent}% today` : ""}.` : "First in today."}{" "}
              {recall && banterParts(recall)}
            </p>
          </section>

          <MatchStats className="order-2 mt-5 lg:mt-6" sides={["Won", "Lost"]} rows={dayStats(points, recall, order)} />

          <div className="order-5 mt-5 lg:mt-6">
            <ShareButtons
              text={shareText}
              tone="teal"
              label="Send the card"
              sub={`Can they beat ${points}?`}
              className=""
              image={card ? { url: "/daily/card", name: `iknowball-daily-${String(issue).padStart(3, "0")}.png` } : null}
            />
            {/* Not on a first full time, which asks "Who do you support?" instead. */}
            {!props.clubChoices && <SeasonTicket guest={props.guest} icon={APP_ICON_SRC} season={seasonLabel(seasonOf(gameDate()))} />}
            {!props.clubChoices && <WhistleStrip guest={props.guest} className="mt-6" />}
          </div>

          <TodaysTable top={props.top} me={props.me} players={players} />

          <div className="order-9 mt-6 flex items-center justify-between border-t-2 border-navy pt-3">
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

        <div className="contents lg:block lg:pt-5">
          {recall && <Squad recall={recall} kit={kit} />}
          {order && <SecondHalf order={order} kits={props.orderKits} />}

          {props.clubChoices && (
            <section className="order-6 mt-6 border-y-4 border-double border-navy py-3.5 lg:mt-7 lg:py-4">
              <h2 className="font-display text-[40px] leading-[0.9] uppercase lg:text-[44px]">
                Who do you support?
              </h2>
              <p className="mt-1.5 text-sm leading-snug lg:text-[15px]">
                Your club dresses your shirt and puts you in the fanbase table. It never changes your questions or your score. You can switch once a
                season.
              </p>
              <ClubPicker clubs={props.clubChoices} current={null} mode="prompt" featured={props.featuredClubs} />
            </section>
          )}
        </div>
      </div>
      <ExtraTime three={props.clash.three} stat={props.clash.stat} />
    </main>
  );
}

/** The scoreline (option B): your points against the ones that got away, on the broadcast's navy bar. */
function Scoreline({ title, points, kit }: { title: string; points: number; kit: Kit }) {
  return (
    <div className="border-[2.5px] border-navy bg-navy text-white shadow-[5px_5px_0_var(--color-teal-light)] lg:shadow-[7px_7px_0_var(--color-teal-light)]">
      <div className="flex items-center justify-between gap-3 border-b-[1.5px] border-slate px-3 py-2 lg:px-4">
        <span className="label truncate text-[10px] text-teal-light lg:text-[11px]">{title} · the Daily</span>
        <span className="bg-teal px-2 pt-1 font-display text-lg leading-none uppercase">FT</span>
      </div>
      <div className="grid grid-cols-[64px_minmax(0,1fr)_64px] items-center gap-2 px-3 pt-3 pb-2.5 lg:grid-cols-[84px_minmax(0,1fr)_84px] lg:px-4">
        <span className="block w-[52px] lg:w-[70px]">
          <ShirtBack kit={kit} name="You" />
        </span>
        <span className="flex items-baseline justify-center gap-2 font-display leading-[0.85] tabular-nums" aria-label={`${points} won, ${100 - points} lost`}>
          <span className="text-[76px] text-teal-light lg:text-[96px]">{points}</span>
          <span className="text-[40px] text-slate lg:text-[48px]">–</span>
          <span className="text-[76px] lg:text-[96px]">{100 - points}</span>
        </span>
        <span className="block w-[52px] justify-self-end lg:w-[70px]">
          <ShirtBack state="miss" num="×" name="Lost" />
        </span>
      </div>
      <div className="flex justify-between border-t-[1.5px] border-slate px-3 py-2 text-xs lg:px-4 lg:text-sm">
        <span className="text-teal-light">Points won</span>
        <span>Points lost</span>
      </div>
    </div>
  );
}

/** What you won against what got away: the day, each half's points, then each half's answers. */
function dayStats(points: number, recall: RecallReveal | null, order: OrderReveal | null): StatRow[] {
  const rows = [statRow("Points", points, 100 - points, 100)];
  if (recall) rows.push(statRow("1st half points", recall.score, PART_MAX[1] - recall.score, PART_MAX[1]));
  if (order) rows.push(statRow("2nd half points", order.score, PART_MAX[2] - order.score, PART_MAX[2]));
  if (recall) {
    const total = recall.found.length + recall.missed.length;
    rows.push(statRow(recall.daily.format === "pick" ? "1st half right · wrong" : "Found · got away", recall.found.length, recall.missed.length, total));
  }
  if (order) {
    const wrong = order.slots.length - order.correct;
    rows.push(statRow(order.daily.format === "era" ? "2nd half right · wrong" : "In place · out of place", order.correct, wrong, order.slots.length));
  }
  return rows;
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

/** The first half (Collins, 14 Nov 2026, option B): the players you found on
 * the pitch by position, whoever doesn't fit on the bench, and the ones who got
 * away off the pitch as "Missed chances", the same size as the shirts on it. */
function Squad({ recall, kit }: { recall: RecallReveal; kit: Kit | null }) {
  const found = recall.found.length;
  const total = found + recall.missed.length;
  const team = fullTimeLineup(recall.found, []);
  return (
    <section className="order-3 mt-7 lg:mt-0" aria-label={`First half: ${found} of ${total} found, ${recall.missed.length} got away`}>
      <div className="flex items-baseline justify-between border-b-2 border-navy pb-1.5">
        <h2 className="font-display text-2xl leading-none uppercase lg:text-[26px]">1st half · {recall.daily.format === "pick" ? "Right" : "Goals"}</h2>
        <span className="label text-royal">
          {found} of {total}
        </span>
      </div>
      <Pitch half="attack" className="mt-2.5 aspect-[358/400] lg:aspect-[4/3]">
        {team.pitch
          .filter((spot) => spot.player)
          .map((spot) => (
            <div key={`${spot.x}-${spot.y}`} className="absolute w-[19cqw] -translate-1/2 lg:w-[14cqw]" style={{ left: `${spot.x}%`, top: `${spot.y}%` }}>
              <ShirtBack kit={kit ?? undefined} name={shirtName(spot.player!.text)} num={spot.player!.num} />
            </div>
          ))}
      </Pitch>
      {team.bench.length > 0 && (
        <OffPitch label="Bench">
          {team.bench.map((p) => (
            <ShirtBack key={p.id} kit={kit ?? undefined} name={shirtName(p.text)} num={p.num} />
          ))}
        </OffPitch>
      )}
      {recall.missed.length > 0 && (
        <>
          <div className="mt-4 flex items-baseline justify-between border-b-2 border-red-card pb-1.5">
            <h3 className="font-display text-2xl leading-none uppercase lg:text-[26px]">Missed chances</h3>
            <span className="label text-red-card">{recall.missed.length} got away</span>
          </div>
          <div className="mt-2.5 grid grid-cols-5 gap-x-[4.5%] gap-y-2 px-[1%] lg:grid-cols-7 lg:gap-x-[3.3%]">
            {recall.missed.map((m) => (
              <ShirtBack key={m.id} name={shirtName(m.text)} num="×" state="miss" />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

/** A labelled row of shirts under the pitch. */
function OffPitch({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-2.5 grid grid-cols-[62px_minmax(0,1fr)] items-center gap-2">
      <span className="label text-[10px] text-navy/80 lg:text-xs">{label}</span>
      <div className="grid grid-cols-5 gap-x-2 gap-y-1.5">{children}</div>
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

/** The second half as a VAR review (Collins, 14 Nov 2026, option B): only
 * the answers that went wrong, each with what you said, then a line naming
 * the ones that stood. */
function SecondHalf({ order, kits }: { order: OrderReveal; kits?: Record<string, PathClub> }) {
  const era = order.daily.format === "era";
  // A career path's answers are clubs: each wears its shirt and keeps its whole name.
  const career = order.daily.template === "career-path";
  const nameOf = career ? (name: string) => name : shirtName;
  const yours = order.slots.map((s) => s.placed);
  const rows: SheetRow[] = [];
  const stood: string[] = [];
  order.slots.forEach((s, i) => {
    if (era) {
      const { player, club } = eraParts(s.note);
      if (s.right) return void stood.push(stickerName(player));
      rows.push({
        title: stickerName(player),
        value: <SheetAnswer right={false}>{period(s.correct)}</SheetAnswer>,
        text: <span className="font-semibold text-red-card">{club && <>{club} · </>}You said {s.placed ? period(s.placed) : "nothing"}</span>,
        warn: true,
      });
      return;
    }
    if (s.right) return void stood.push(nameOf(s.correct));
    const at = yours.indexOf(s.correct);
    rows.push({
      title: (
        <span className="inline-flex items-center gap-2">
          {career && (
            <span className="w-7 shrink-0 lg:w-8">
              <ShirtBack kit={kits?.[s.correct]?.kit} />
            </span>
          )}
          {nameOf(s.correct)} · {ordinal(i + 1)}
        </span>
      ),
      value: <SheetAnswer right={false}>{s.note ?? ""}</SheetAnswer>,
      text: <span className="font-semibold text-red-card">{at >= 0 ? `You had ${career ? "it" : "him"} ${ordinal(at + 1)}` : "You didn't place him"}</span>,
      warn: true,
    });
  });
  rows.push({
    title: stood.length === order.slots.length ? "Every one stood" : stood.length ? `Decision stands on ${stood.length === 1 ? "one" : `the other ${stood.length}`}` : "None stood",
    text: stood.length && stood.length < order.slots.length ? stood.join(", ") : undefined,
    value: <SheetValue className="text-teal-light">{order.correct}/{order.slots.length}</SheetValue>,
    dark: true,
  });
  return (
    <section className="order-4 mt-6">
      <TeamSheet name={`VAR review · 2nd half · ${FORMAT_NAME[order.daily.format]}`} tag={`${order.correct}/${order.slots.length}`} rows={rows} />
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
        {right ? <Check /> : <Cross />}
      </span>
    </span>
  );
}

/** An Era picks period as the tickets print it: "1995–2006" reads "1995 → 2006", an open one "2019 → now". */
function period(choice: string): React.ReactNode {
  const [from, to] = choice.split("–");
  return to === undefined ? choice : <>{from} <Arrow /> {to || "now"}</>;
}

/** Elsewhere today (option B): the top three and you, printed plain. */
function TodaysTable({ top, me, players }: { top: TableRow[]; me: TableRow | null; players: number }) {
  const rows = me && !top.some((r) => r.userId === me.userId) ? [...top, me] : top;
  if (!rows.length) return null;
  return (
    <section className="order-8 mt-7">
      <div className="flex items-baseline justify-between border-b-2 border-navy pb-1.5">
        <h2 className="font-display text-2xl leading-none uppercase lg:text-[26px]">Elsewhere today</h2>
        <Link href="/daily/table" className="label underline-offset-2 hover:underline">
          {players} played · whole table <Arrow />
        </Link>
      </div>
      <ol className="mt-1 text-sm lg:text-[15px]">
        {rows.map((r) => (
          <li
            key={r.userId}
            className={`flex justify-between gap-2 py-1.5 ${r.userId === me?.userId ? "-mx-2 bg-slate px-2 text-white" : "border-b border-track"}`}
          >
            <span className="min-w-0 truncate">
              {r.position} · {r.userId === me?.userId ? "You" : r.name}
            </span>
            <b className="font-display text-[17px] tabular-nums">{r.score}</b>
          </li>
        ))}
      </ol>
    </section>
  );
}
