import { startPart } from "@/app/(site)/daily/actions";
import { DailySticker } from "@/components/home/DailySticker";
import type { DailyRow, RecallReveal } from "@/lib/daily/data";
import { PART_MAX } from "@/lib/daily/score";
import { clubInTitle, type Club } from "@/lib/profile/club";
import { clock } from "./clock";
import { headlineFixture } from "./fixture";
import { FORMAT_NAME } from "./formats";
import { Masthead } from "./Masthead";
import { RecallGrid } from "./RecallGrid";
import type { Kit } from "./ShirtBack";
import { SubmitButton } from "./SubmitButton";

// The Daily's kick-off (step 1 of docs/redesign-plan.md, picked 21 Oct 2026):
// before Part 1, the home page's Daily sticker with the gaffer's instructions
// and a teal Kick off; between parts, the half-time block and your shirts with
// the team talk for the 2nd half. Desktop puts the two side by side.

type Props = {
  issue: number;
  dateLabel: string;
  /** The part about to start. */
  daily: DailyRow;
  parts: DailyRow[];
  total: number;
  /** Part 1's result, once it's played. */
  before: RecallReveal | null;
  club: Club | null;
  /** The answer shirts' half-and-half kit. */
  kit: Kit | null;
  /** Each club's own kit, for the sticker's floating shirts. */
  kits: [Kit | undefined, Kit | undefined];
  closesAt: string;
  serverNow: number;
};

type Note = { big: string; title: string; text: string };

export function KickOff({ issue, dateLabel, daily, parts, total, before, club, kit, kits, closesAt, serverNow }: Props) {
  const fixture = before ? before.daily.title : daily.title;
  const yourLot = !before && clubInTitle(club, fixture);
  const second = parts.find((p) => p.part === 2);

  return (
    <main className="mx-auto w-full max-w-[560px] flex-1 px-4 pb-10 lg:max-w-[1184px]">
      <Masthead issue={issue} right={dateLabel} />
      <div className="mt-4 lg:mt-6 lg:grid lg:grid-cols-12 lg:gap-10">
        <div className="lg:col-span-7">
          {before ? (
            <HalfTime before={before} kit={kit} />
          ) : (
            <DailySticker variant="kickoff" daily={{ issue, parts, status: "fresh", points: 0 }} kits={kits} closesAt={closesAt} serverNow={serverNow} />
          )}
        </div>

        <div className="mt-7 flex flex-col gap-5 lg:col-span-5 lg:mt-0">
          {before && (
            <div>
              <span className="label text-royal">
                Part 2 of {total} · opens now
              </span>
              <h1 className="mt-1 font-display text-[44px] leading-[0.9] uppercase lg:text-[64px] lg:leading-[0.88]">
                {daily.format === "era" ? "Era" : "In"} <span className="sash-mark">{daily.format === "era" ? "picks" : "order"}</span>
              </h1>
              <p className="mt-2 text-[17px] leading-snug lg:text-lg">{daily.prompt}</p>
            </div>
          )}

          <Notes
            title={before ? "Team talk" : "The gaffer's instructions"}
            notes={before ? teamTalk(daily) : gafferNotes(daily, second)}
            stackOnDesktop={!before}
          />

          {yourLot && (
            <p className="flex items-center gap-2.5 border-2 border-dashed border-navy px-3 py-2.5 text-sm font-semibold lg:text-base">
              <span className="label shrink-0 border-[1.5px] border-navy bg-teal-light px-1.5 py-0.5 text-[10px] lg:text-[11px]">Your club</span>
              Your lot are on today. Show them what {club!.name} fans know.
            </p>
          )}

          <form action={startPart}>
            <input type="hidden" name="dailyId" value={daily.id} />
            <SubmitButton tone="teal" pendingText="Starting…">
              {before ? "Start the 2nd half" : "Kick off"}
            </SubmitButton>
            {!before && (
              <p className="mt-2.5 text-center text-[13px] text-navy/80 lg:text-sm">
                Part 1 · {FORMAT_NAME[daily.format]} · {clock(daily.time_limit_seconds)} on the clock
              </p>
            )}
          </form>
        </div>
      </div>
    </main>
  );
}

/** Part 1's result: the half-time block and every answer as a shirt. */
function HalfTime({ before, kit }: { before: RecallReveal; kit: Kit | null }) {
  const found = before.found.length;
  const all = found + before.missed.length;
  const line =
    before.missed.length === 0
      ? `Clean sheet: all ${all} found.`
      : found === 0
        ? "Nothing on the sheet yet. The 2nd half is a fresh start."
        : `${found} found, ${before.missed.length} got away. The 2nd half can still lift the day.`;
  return (
    <>
      <section className="grid grid-cols-[110px_minmax(0,1fr)] border-2 border-navy lg:grid-cols-[150px_minmax(0,1fr)]">
        <div className="flex flex-col justify-between bg-navy p-2.5 text-center text-white lg:p-3.5">
          <span className="label text-[10px] text-teal-light lg:text-xs">Half-time</span>
          <span className="font-display text-[64px] leading-[0.85] text-teal-light tabular-nums lg:text-[96px]">
            {found}
            <span className="text-[26px] text-white lg:text-[36px]">/{all}</span>
          </span>
          <span className="label text-[10px] lg:text-xs">
            {before.score} / {PART_MAX[before.daily.part]} pts
          </span>
        </div>
        <div className="p-2.5 px-3 lg:px-5 lg:py-4">
          <span className="label text-[10px] text-royal lg:text-xs">Part 1 · {FORMAT_NAME[before.daily.format]}</span>
          <div className="mt-0.5 font-display text-[28px] leading-[0.9] uppercase lg:text-[44px]">{headlineFixture(before.daily.title)}</div>
          <p className="mt-1.5 text-[13px] lg:mt-2.5 lg:text-base">{line}</p>
        </div>
      </section>
      <div className="mt-3 lg:mt-5">
        <RecallGrid reveal={before} kit={kit} />
      </div>
    </>
  );
}

function gafferNotes(daily: DailyRow, second: DailyRow | undefined): Note[] {
  const quick =
    daily.format === "free_recall"
      ? { big: "1", title: "Be quick", text: "Type the names. Typos are forgiven." }
      : { big: "1", title: "Be quick", text: "One tap per question." };
  const after = second
    ? { big: "3", title: "Then the 2nd half", text: `${FORMAT_NAME[second.format]} straight after. 100 on the day.` }
    : { big: "3", title: "Up to 100", text: "Every right answer counts." };
  return [quick, { big: "2", title: "One go", text: "Leave and the clock runs on." }, after];
}

function teamTalk(daily: DailyRow): Note[] {
  return [
    daily.format === "era"
      ? { big: String(daily.answer_count), title: "Players", text: "One era each." }
      : { big: String(daily.answer_count), title: "To order", text: "Earliest at the top." },
    { big: clock(daily.time_limit_seconds), title: "On the clock", text: "Starts on kick-off." },
    { big: String(PART_MAX[daily.part] ?? 0), title: "Points", text: "Still to play for." },
  ];
}

const TILT = ["-rotate-[1.5deg]", "rotate-1", "-rotate-[0.8deg]"];

/** Three tilted stickers. Before Part 1 they stack into rows on desktop. */
function Notes({ title, notes, stackOnDesktop }: { title: string; notes: Note[]; stackOnDesktop: boolean }) {
  return (
    <section>
      <h2 className="label border-b-2 border-navy pb-1.5">{title}</h2>
      <ol className={`mt-3.5 grid grid-cols-3 gap-2.5 lg:mt-4 ${stackOnDesktop ? "lg:grid-cols-1 lg:gap-3.5" : "lg:gap-3.5"}`}>
        {notes.map((n, i) => (
          <li
            key={n.title}
            className={`border-[2.5px] border-navy bg-white p-2 shadow-[3px_3px_0_var(--color-navy)] lg:p-3 lg:shadow-[4px_4px_0_var(--color-navy)] ${TILT[i]} ${
              stackOnDesktop ? "lg:grid lg:grid-cols-[44px_minmax(0,1fr)] lg:items-center lg:gap-3 lg:px-3.5 lg:py-2.5" : ""
            }`}
          >
            <span className="block font-display text-[26px] leading-none text-royal tabular-nums lg:text-[34px]">{n.big}</span>
            <span className="block">
              <span className="mt-1 block font-display text-[17px] leading-none uppercase lg:mt-1.5 lg:text-[22px]">{n.title}</span>
              <span className="mt-1 block text-xs leading-snug lg:mt-1.5 lg:text-sm">{n.text}</span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
