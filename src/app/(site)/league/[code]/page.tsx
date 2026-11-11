import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { JoinButton, JoinLeague } from "@/components/league/Forms";
import { FormTable, Invite, Podium, Rules, SeasonTable, TeamSheet, ThisWeek } from "@/components/league/LeaguePage";
import { WeekStrip } from "@/components/league/WeekStrip";
import { LeagueLoading, LeagueMasthead } from "@/components/league/Masthead";
import { cleanCode, weekLabel } from "@/components/league/format";
import { getLeagueView, LEAGUE_MAX } from "@/lib/league/data";
import { seasonLabel, seasonOf } from "@/lib/time";
import { dayIndex, splitPodium } from "@/lib/league/standing";
import { CLASH_MAX, COUNTED_DAYS } from "@/lib/league/week";
import { kitOf } from "@/lib/profile/club";
import { leaveLeague } from "../actions";

export const metadata: Metadata = {
  title: "The League · iKnowBall",
  description: "Join my league on iKnowBall. Best 5 Dailies plus best 3 Clash sprints a week, out of 600.",
};

const WEEK_MAX = COUNTED_DAYS * 100 + CLASH_MAX;
const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

type Params = Promise<{ code: string }>;
type Search = Promise<{ new?: string; w?: string }>;

export default function LeagueTablePage({ params, searchParams }: { params: Params; searchParams: Search }) {
  return (
    <Suspense fallback={<LeagueLoading />}>
      <LeagueScreen params={params} searchParams={searchParams} />
    </Suspense>
  );
}

/** The league's name, all in navy like every heading (Collins, 11 Nov 2026). */
function Title({ name, className }: { name: string; className: string }) {
  return <h1 className={`font-display uppercase break-words ${className}`}>{name}</h1>;
}

/** The top three on the podium, the rest on the table standing on its floor. */
function PodiumAndTable<T extends { points: number } & Parameters<typeof Podium>[0]["rows"][number]>({ rows, table }: { rows: T[]; table: (rest: T[]) => React.ReactNode }) {
  const { podium, rest } = splitPodium(rows);
  return (
    <>
      <Podium rows={podium} />
      {rest.length ? table(rest) : <div aria-hidden="true" className="h-2 bg-navy" />}
    </>
  );
}

const players = (n: number) => `${n} ${n === 1 ? "player" : "players"}`;

// Reads the session and the week, so it renders per request.
async function LeagueScreen({ params, searchParams }: { params: Params; searchParams: Search }) {
  await connection();
  const [{ code }, search] = await Promise.all([params, searchParams]);
  const view = await getLeagueView(cleanCode(code), search.w);

  if (view.kind === "missing") {
    return (
      <main className="mx-auto w-full max-w-[560px] flex-1 px-4 pb-10">
        <LeagueMasthead right="Invite" />
        <h1 className="mt-6 font-display text-[50px] leading-[0.9] uppercase">
          No such league
        </h1>
        <p className="mt-3 mb-5 text-lg">That code doesn&apos;t match a league. Check it with whoever sent it.</p>
        <JoinLeague />
      </main>
    );
  }

  if (view.kind === "invite") {
    const { league, rows, captain, full } = view;
    return (
      <main className="mx-auto w-full max-w-[560px] flex-1 px-4 pb-10">
        <LeagueMasthead right={`Invite · ${league.invite_code}`} />
        {/* The invite is a ticket: who sent it, the league, the way in. */}
        <section className="mt-[26px] grid -rotate-[0.6deg] grid-cols-[minmax(0,1fr)_84px] border-[3px] border-navy shadow-[5px_5px_0_var(--color-navy)]">
          <div className="min-w-0 py-3 pr-2.5 pl-3.5">
            <div className="label flex justify-between gap-2 text-[10px]">
              <span>Admit one · League</span>
              <span className="text-royal">
                {rows.length} of {LEAGUE_MAX}
              </span>
            </div>
            <p className="mt-2 text-sm">{captain} wants you in</p>
            <Title name={league.name} className="mt-0.5 mb-2.5 text-[48px] leading-[0.86]" />
            {full ? (
              <p className="border-l-[3px] border-red-card pl-3 font-semibold text-red-card">This league is full: {LEAGUE_MAX} players is the most.</p>
            ) : (
              <div className="mr-1.5">
                <JoinButton code={league.invite_code} />
              </div>
            )}
          </div>
          <div className="flex flex-col items-center justify-between border-l-[3px] border-dashed border-navy bg-teal px-1 py-3 text-center">
            <span className="label text-[9px]">Out of</span>
            <span className="font-display text-[46px] leading-[0.85]">{WEEK_MAX}</span>
            <span className="font-display text-sm leading-none uppercase">A week, Mon to Sun</span>
          </div>
        </section>
        <div className="mt-7 grid grid-cols-[minmax(0,1fr)] gap-[26px]">
          <ThisWeek rows={rows} />
          <TeamSheet rows={rows} open={!full} />
          <Rules
            items={[
              "Scored Monday to Sunday, locked at midnight.",
              `Your best 5 Dailies plus your best 3 sprints, out of ${WEEK_MAX}.`,
              "Join any day: your best days from here still count.",
            ]}
          />
        </div>
      </main>
    );
  }

  const { league, week, rows, captain, strip, shown, seasonPlace } = view;
  const today = dayIndex(week.startsOn, week.today);
  const fresh = search.new === "1";
  const mine = rows.find((r) => r.mine);
  const season = shown.kind === "season";
  return (
    <main className="mx-auto w-full max-w-[560px] flex-1 px-4 pb-10 lg:max-w-[1040px]">
      <LeagueMasthead back right={fresh ? "New league" : weekLabel(week)} />
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-11">
        <div className="min-w-0">
          <span className="label mt-3.5 block text-[10px] text-royal lg:mt-[18px] lg:text-[11px]">
            {players(rows.length)} · {WEEKDAYS[today]}
          </span>
          <Title name={league.name} className="mt-0.5 text-[44px] leading-[0.86] lg:text-[64px] lg:leading-[0.84]" />
          {fresh && <p className="mt-2">You&apos;re in. Send the invite to get your friends on the team sheet.</p>}
          <WeekStrip code={league.invite_code} weeks={strip} selected={season ? "season" : (shown.n ?? 0)} seasonPlace={seasonPlace} />
          <div className="mt-3.5 flex items-center justify-between gap-3 lg:mt-4">
            <span className="label text-[10px] lg:text-[11px]">
              {shown.kind === "season"
                ? `Season ${seasonLabel(seasonOf(week.today))} · ${shown.weeks === 1 ? "Week 1" : `Weeks 1–${shown.weeks}`}`
                : `${shown.n ? `Week ${shown.n} · ` : ""}${weekLabel(shown.week)}`}
            </span>
            {shown.kind === "week" && shown.final && (
              <span className="-rotate-3 border-[3px] border-red-card px-2 pt-0.5 font-display text-lg leading-none text-red-card uppercase">Full time</span>
            )}
            {shown.kind === "week" && !shown.final && <span className="label text-[10px] text-teal lg:text-[11px]">Live</span>}
          </div>
          {shown.rows.some((r) => r.points > 0) ? (
            <div className="mt-2.5 lg:mt-3">
              {shown.kind === "season" ? (
                <PodiumAndTable rows={shown.rows} table={(rest) => <SeasonTable rows={rest} captainId={league.owner_id} />} />
              ) : (
                <PodiumAndTable rows={shown.rows} table={(rest) => <FormTable rows={rest} today={shown.final ? 6 : today} captainId={league.owner_id} />} />
              )}
            </div>
          ) : (
            <p className="mt-3 border-2 border-dashed border-track px-3 py-4 text-center text-sm text-slate">
              {season ? "Nobody has scored this season yet." : "Nobody scored this week."}
            </p>
          )}
        </div>

        <aside className="mt-[30px] grid grid-cols-[minmax(0,1fr)] content-start gap-[26px] lg:mt-[34px]">
          {rows.length < LEAGUE_MAX && <Invite league={league} kit={kitOf(mine?.club ?? null)} members={rows.length} max={LEAGUE_MAX} />}
          <div>
            <Rules
              items={[
                "Scored Monday to Sunday, locked at midnight.",
                `Your best 5 Dailies (500) plus your best 3 sprints (${CLASH_MAX}).`,
                "Level on points? Less time on the counted days wins.",
                `${league.owner_id === mine?.userId ? "You're" : `${captain} is`} captain. If the captain leaves, the armband goes to whoever joined first.`,
              ]}
            />
            <form action={leaveLeague} className="mt-3.5">
              <input type="hidden" name="code" value={league.invite_code} />
              <button type="submit" className="text-sm font-semibold text-red-card underline underline-offset-[3px]">
                Leave {league.name}
              </button>
            </form>
          </div>
        </aside>
      </div>
    </main>
  );
}
