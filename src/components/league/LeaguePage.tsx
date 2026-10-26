import { ChallengeButton } from "@/components/clash/ChallengeButton";
import { ShirtBack, shirtName, type Kit } from "@/components/daily/ShirtBack";
import { leagueCode } from "@/components/league/format";
import { publicEnv } from "@/lib/env";
import type { League, TableLine } from "@/lib/league/data";
import { formGuide, type FormDay } from "@/lib/league/standing";
import { CLASH_MAX, COUNTED_DAYS } from "@/lib/league/week";
import { kitOf } from "@/lib/profile/club";

// A league's page, "D" (picked 26 Oct 2026, mocks at
// https://claude.ai/artifact/Lcqpxhr7GQS8FvB5HWJZBV): the top three on a
// podium, everyone else in a table with their week as a form guide, the
// invite code on six shirts and the rules printed like a programme.

const WEEK_MAX = COUNTED_DAYS * 100 + CLASH_MAX;
const DAYS = ["M", "T", "W", "T", "F", "S", "S"];
const you = (r: TableLine) => (r.mine ? "You" : r.name);

/** The top three, 2nd · 1st · 3rd, in their club's shirts on navy steps. */
export function Podium({ rows }: { rows: TableLine[] }) {
  const steps = [
    { row: rows[1], shirt: "w-[84%] -rotate-[1.5deg]", step: "h-11 lg:h-[60px]" },
    { row: rows[0], shirt: "w-[96%] rotate-1", step: "h-16 lg:h-[88px]" },
    { row: rows[2], shirt: "w-[84%] rotate-[0.6deg]", step: "h-[30px] lg:h-10" },
  ];
  return (
    <section aria-label="Top three" className="border-2 border-navy bg-mist px-3 pt-[30px] lg:px-[22px] lg:pt-[34px]">
      <ol className="mx-auto grid max-w-[480px] grid-cols-3 items-end gap-2 lg:gap-6">
        {steps.map(({ row, shirt, step }, i) => (
          <li key={row?.userId ?? i} className="flex flex-col items-center">
            {row && (
              <>
                <span className={`block ${shirt}`}>
                  <ShirtBack kit={kitOf(row.club)} num={row.position} name={shirtName(you(row))} />
                </span>
                <span className={`mt-1 font-display text-2xl leading-none tabular-nums lg:mt-1.5 lg:text-[32px] ${row.mine ? "text-royal" : ""}`}>
                  {row.points}
                  <span className="sr-only"> points, {you(row)}</span>
                </span>
                <span aria-hidden="true" className={`mt-1.5 grid w-full place-items-center bg-navy font-display text-[26px] text-teal-light lg:mt-2 lg:text-[34px] ${step}`}>
                  {row.position}
                </span>
              </>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}

const BOX: Record<FormDay["kind"], string> = {
  counts: "bg-royal text-white",
  dropped: "border-[1.5px] border-[#8E9BD6] bg-white text-[#5A67A8] line-through",
  missed: "bg-mist text-[#8E9BD6]",
  ahead: "border-[1.5px] border-dashed border-track",
};

function Form({ row, today }: { row: TableLine; today: number }) {
  const days = formGuide(row.days, row.counted, today);
  return (
    <span className="flex gap-[3px] lg:gap-1" aria-hidden="true">
      {days.map((d, i) => (
        <span key={i} className={`grid h-5 w-5 place-items-center font-display text-[11px] tabular-nums lg:h-[26px] lg:w-[29px] lg:text-sm ${BOX[d.kind]}`}>
          {d.kind === "missed" ? "–" : d.score}
        </span>
      ))}
    </span>
  );
}

/** "Mon 60, Wed 71 …" for screen readers, in place of the boxes. */
function formText(row: TableLine, today: number): string {
  const names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const played = formGuide(row.days, row.counted, today)
    .map((d, i) => (d.score === null ? null : `${names[i]} ${d.score}${d.kind === "dropped" ? " dropped" : ""}`))
    .filter(Boolean);
  return played.length ? played.join(", ") : "No Dailies yet";
}

function Move({ moved }: { moved: number | null }) {
  if (!moved) return null;
  return (
    <span className={`label text-[10px] ${moved > 0 ? "text-teal" : "text-red-card"}`}>
      {moved > 0 ? "▲" : "▼"}
      {Math.abs(moved)}
      <span className="sr-only">{moved > 0 ? " up" : " down"} today</span>
    </span>
  );
}

function Armband() {
  return (
    <span title="Captain" className="border-[1.5px] border-navy bg-teal-light px-[3px] font-display text-[11px] leading-tight lg:text-xs">
      C<span className="sr-only">aptain</span>
    </span>
  );
}

/** Everyone off the podium, each with their week as a form guide. `today` is the day's index in the week. */
export function FormTable({ rows, today, captainId }: { rows: TableLine[]; today: number; captainId: string }) {
  if (!rows.length) return null;
  return (
    <section aria-label="The table" className="tabular-nums">
      <div className="label grid grid-cols-[20px_32px_minmax(0,1fr)_44px] items-end gap-2 border-b-2 border-navy pb-[5px] text-[10px] lg:grid-cols-[30px_40px_minmax(0,1fr)_230px_70px_60px] lg:gap-3 lg:pb-1.5 lg:text-[11px]">
        <span>#</span>
        <span />
        <span className="flex items-end justify-between lg:block">
          <span>Player</span>
          <span className="flex gap-[3px] tracking-normal lg:hidden">
            {DAYS.map((d, i) => (
              <span key={i} className="w-5 text-center">
                {d}
              </span>
            ))}
          </span>
        </span>
        <span className="hidden gap-1 tracking-normal lg:flex">
          {DAYS.map((d, i) => (
            <span key={i} className="w-[29px] text-center">
              {d}
            </span>
          ))}
        </span>
        <span className="hidden text-right lg:block">Clash</span>
        <span className="text-right">Pts</span>
      </div>
      <ol>
        {rows.map((r) => (
          <li
            key={r.userId}
            className={`grid grid-cols-[20px_32px_minmax(0,1fr)_44px] items-center gap-2 border-b border-track py-2 lg:grid-cols-[30px_40px_minmax(0,1fr)_230px_70px_60px] lg:gap-3 ${
              r.mine ? "-mx-2 bg-mist px-2 lg:-mx-2.5 lg:px-2.5" : ""
            }`}
          >
            <span className="font-display text-[22px] lg:text-[26px]">{r.points > 0 ? r.position : "–"}</span>
            <span aria-hidden="true">
              <ShirtBack kit={kitOf(r.club)} />
            </span>
            <span className="min-w-0">
              <span className="flex items-center justify-between gap-1.5">
                <span className="flex min-w-0 items-center gap-[5px] font-semibold">
                  <span className="truncate">{you(r)}</span>
                  {r.userId === captainId && <Armband />}
                  <Move moved={r.moved} />
                </span>
                {r.clash > 0 && <span className="label shrink-0 text-[10px] text-[#00807F] lg:hidden">+{r.clash} Clash</span>}
              </span>
              <span className="mt-1 flex justify-end lg:hidden">
                <Form row={r} today={today} />
              </span>
              <span className="sr-only">{formText(r, today)}</span>
            </span>
            <span className="hidden lg:block">
              <Form row={r} today={today} />
            </span>
            <span className="hidden text-right font-display text-xl text-[#00807F] lg:block">{r.clash > 0 ? `+${r.clash}` : "–"}</span>
            <span className="text-right">
              <span className="block font-display text-[28px] leading-none lg:text-[30px]">{r.points}</span>
              <span className="label text-[9px] text-slate lg:text-[10px]">/ {WEEK_MAX}</span>
            </span>
          </li>
        ))}
      </ol>
      <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate lg:mt-2.5 lg:gap-x-[18px] lg:text-[13px]">
        <span>
          <b aria-hidden="true" className="inline-block h-2.5 w-2.5 bg-royal align-[-1px]" /> Counts
        </span>
        <span>
          <b aria-hidden="true" className="inline-block h-2.5 w-2.5 border-[1.5px] border-[#8E9BD6] align-[-2px]" /> Dropped: only your best 5 count
        </span>
        <span className="font-semibold text-[#00807F] lg:hidden">+N Clash</span>
      </p>
    </section>
  );
}

/** The invite: the code on six shirts in your kit, the link and a share button. */
export function Invite({ league, kit, members, max }: { league: League; kit: Kit; members: number; max: number }) {
  const url = `${publicEnv().NEXT_PUBLIC_SITE_URL.replace(/\/$/, "")}/league/${league.invite_code}`;
  return (
    <section aria-label="Invite" className="relative border-[3px] border-navy px-3 pt-3.5 pb-1 lg:px-3.5 lg:pt-4">
      <span className="absolute -top-3.5 left-3 -rotate-2 border-2 border-navy bg-teal-light px-2.5 py-0.5 font-display text-[19px] uppercase shadow-[3px_3px_0_var(--color-navy)]">
        Invite code · {members} of {max}
      </span>
      <div className="mt-2.5 grid grid-cols-[auto_repeat(6,minmax(0,1fr))] items-center gap-[5px]" aria-label={`Invite code ${leagueCode(league.invite_code)}`} role="img">
        <span className="bg-navy px-1 py-0.5 font-display text-[13px] tracking-[0.06em] text-teal-light lg:text-sm">IKB</span>
        {[...league.invite_code].map((ch, i) => (
          <ShirtBack key={i} kit={kit} num={ch} />
        ))}
      </div>
      <p className="my-2.5 border-2 border-dashed border-royal p-2 text-[13px] font-semibold break-all text-royal">{url.replace(/^https?:\/\//, "")}</p>
      <div className="mr-1">
        <ChallengeButton
          url={url}
          text={`Join my league "${league.name}" on iKnowBall with the code ${leagueCode(league.invite_code)}. Best 5 Dailies plus best 3 Clash sprints a week, out of ${WEEK_MAX}.`}
          label="Send the invite"
          tone="teal"
        />
      </div>
    </section>
  );
}

/** The rules, printed like a programme's. */
export function Rules({ items }: { items: string[] }) {
  return (
    <section aria-label="Rules of the league">
      <span className="label text-[10px] lg:text-[11px]">Rules of the league</span>
      <ol className="mt-1.5 border-t-4 border-double border-navy text-sm">
        {items.map((text, i) => (
          <li key={i} className="flex gap-2.5 border-b border-track py-[7px]">
            <b className="font-display text-lg leading-tight text-royal">{i + 1}</b>
            {text}
          </li>
        ))}
      </ol>
    </section>
  );
}

/** For someone not in the league: this week so far, on the home page's scoreboard. */
export function ThisWeek({ rows }: { rows: TableLine[] }) {
  const played = rows.filter((r) => r.points > 0);
  const lead = played[0];
  return (
    <section aria-label="This week so far">
      <span className="label text-[10px]">This week so far</span>
      <div className="mt-1.5 grid grid-cols-[96px_minmax(0,1fr)] border-2 border-navy">
        <span className="flex flex-col justify-between gap-1.5 bg-navy p-2.5 text-white">
          <span className="label text-[10px] text-teal-light">To beat</span>
          <span className="font-display text-[50px] leading-[0.85] tabular-nums">{lead ? lead.points : "–"}</span>
          <span className="label truncate text-[10px]">{lead ? `${lead.name} leads` : "Nobody yet"}</span>
        </span>
        <span className="px-3 py-2.5 text-[13px]">
          {played.slice(0, 3).map((r) => (
            <span key={r.userId} className="flex justify-between gap-2 border-b border-track py-[3px]">
              <span className="truncate">
                <b className="font-display">{r.position}</b>&nbsp; {r.name}
              </span>
              <b className="font-display tabular-nums">{r.points}</b>
            </span>
          ))}
          <span className="mt-1.5 block">
            {lead ? "Join today and your best days from here still count." : "Nobody has played this week yet. Join and go top."}
          </span>
        </span>
      </div>
    </section>
  );
}

/** Everyone in the league as their shirt, plus an empty one for you. */
export function TeamSheet({ rows, open }: { rows: TableLine[]; open: boolean }) {
  return (
    <section aria-label={`Team sheet, ${rows.length} ${rows.length === 1 ? "player" : "players"}`}>
      <span className="label text-[10px]">
        Team sheet · {rows.length} {rows.length === 1 ? "player" : "players"}
      </span>
      <ul className="mt-2 grid grid-cols-4 gap-x-2 gap-y-2.5">
        {rows.map((r) => (
          <li key={r.userId}>
            <ShirtBack kit={kitOf(r.club)} name={shirtName(r.name)} />
          </li>
        ))}
        {open && (
          <li aria-hidden="true">
            <ShirtBack state="empty" num="+" />
          </li>
        )}
      </ul>
    </section>
  );
}
