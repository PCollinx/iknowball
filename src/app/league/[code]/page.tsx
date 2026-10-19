import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { ChallengeButton } from "@/components/clash/ChallengeButton";
import { ShirtBack, ROYAL_KIT, shirtName } from "@/components/daily/ShirtBack";
import { JoinButton, JoinLeague } from "@/components/league/Forms";
import { LeagueLoading, LeagueMasthead } from "@/components/league/Masthead";
import { WeekTable } from "@/components/league/WeekTable";
import { weekDay, weekLabel } from "@/components/league/format";
import { publicEnv } from "@/lib/env";
import { getLeagueView, LEAGUE_MAX, type League, type Player } from "@/lib/league/data";
import { kitOf } from "@/lib/profile/club";
import { leaveLeague } from "../actions";

export const metadata: Metadata = {
  title: "The League · iKnowBall",
  description: "Join my league on iKnowBall. Best 5 Dailies a week, out of 500.",
};

type Params = Promise<{ code: string }>;
type Search = Promise<{ new?: string }>;

export default function LeagueTablePage({ params, searchParams }: { params: Params; searchParams: Search }) {
  return (
    <Suspense fallback={<LeagueLoading />}>
      <LeagueScreen params={params} searchParams={searchParams} />
    </Suspense>
  );
}

function Rules() {
  return (
    <ul className="mt-3 grid gap-1.5 text-sm">
      <li className="border-l-[3px] border-teal pl-3">Scored Monday to Sunday. Your best 5 Dailies count, out of 500.</li>
      <li className="border-l-[3px] border-teal pl-3">Join any day: the week still counts your best 5 from the days you play.</li>
      <li className="border-l-[3px] border-teal pl-3">Ties go to whoever used less time on their counted days.</li>
    </ul>
  );
}

function Invite({ league }: { league: League }) {
  const url = `${publicEnv().NEXT_PUBLIC_SITE_URL.replace(/\/$/, "")}/league/${league.invite_code}`;
  return (
    <section aria-label="Invite">
      <span className="label">Invite code</span>
      <div className="mt-2 flex justify-center gap-1.5" aria-label={`Invite code ${league.invite_code}`}>
        {[...league.invite_code].map((ch, i) => (
          <span key={i} aria-hidden="true" className="w-[52px] max-w-full">
            <ShirtBack kit={ROYAL_KIT} num={ch} />
          </span>
        ))}
      </div>
      <p className="my-2.5 border-2 border-dashed border-royal p-2.5 font-semibold break-all text-royal">{url}</p>
      <ChallengeButton url={url} text={`Join my league "${league.name}" on iKnowBall. Best 5 Dailies a week, out of 500.`} label="Send the invite" />
    </section>
  );
}

function TeamSheet({ players }: { players: Player[] }) {
  return (
    <ul className="mt-4 grid grid-cols-4 gap-x-2 gap-y-3 sm:grid-cols-5" aria-label="Team sheet">
      {players.map((p) => (
        <li key={p.userId}>
          <ShirtBack kit={kitOf(p.club)} name={shirtName(p.name)} lettering="tag" />
        </li>
      ))}
    </ul>
  );
}

// Reads the session and the week, so it renders per request.
async function LeagueScreen({ params, searchParams }: { params: Params; searchParams: Search }) {
  await connection();
  const [{ code }, search] = await Promise.all([params, searchParams]);
  const view = await getLeagueView(code.toUpperCase());

  if (view.kind === "missing") {
    return (
      <main className="mx-auto min-h-dvh max-w-[560px] px-4 pb-10">
        <LeagueMasthead right="Invite" />
        <h1 className="mt-6 font-display text-[64px] leading-[0.9] uppercase">
          No such <span className="text-royal">league</span>
        </h1>
        <p className="mt-3 text-lg">That code doesn&apos;t match a league. Check it with whoever sent it.</p>
        <div className="mt-5">
          <JoinLeague />
        </div>
      </main>
    );
  }

  if (view.kind === "invite") {
    return (
      <main className="mx-auto min-h-dvh max-w-[560px] px-4 pb-10">
        <LeagueMasthead right="Invite" />
        <span className="label mt-5 block text-royal">You&apos;re invited</span>
        <h1 className="mt-1 font-display text-[56px] leading-[0.9] break-words uppercase">{view.league.name}</h1>
        <p className="mt-2 text-lg">
          {view.members.length} {view.members.length === 1 ? "player" : "players"} on the team sheet. Think you know ball? Prove it every week.
        </p>
        <TeamSheet players={view.members} />
        <div className="mt-5">
          {view.full ? (
            <p className="border-l-[3px] border-red-card pl-3 font-semibold text-red-card">This league is full: {LEAGUE_MAX} players is the most.</p>
          ) : (
            <JoinButton code={view.league.invite_code} />
          )}
        </div>
        <Rules />
      </main>
    );
  }

  const { league, week, rows } = view;
  const fresh = search.new === "1";
  return (
    <main className="mx-auto min-h-dvh max-w-[560px] px-4 pb-10 lg:max-w-[1040px]">
      <LeagueMasthead right={fresh ? "New league" : weekLabel(week)} />
      <div className="lg:grid lg:grid-cols-[1fr_340px] lg:gap-10">
        <section className="min-w-0">
          <h1 className="mt-4 font-display text-[52px] leading-[0.9] break-words uppercase">{league.name}</h1>
          <p className="mt-1.5 text-navy/75">
            {fresh ? "You're in. Get your mates on the team sheet." : `${weekLabel(week)}. Best 5 of 7 count.`}
          </p>
          <div className="mt-4">
            <WeekTable rows={rows} today={weekDay(week)} cut={rows.length > 4 ? 3 : 0} />
          </div>
          <Link href="/daily" className="mt-2 block bg-navy p-3 text-center font-display text-[22px] text-white uppercase">
            Play today&apos;s Daily
          </Link>
        </section>
        <aside className="mt-7 lg:mt-[22px]">
          {rows.length < LEAGUE_MAX && <Invite league={league} />}
          <span className="label mt-3 block">
            Team sheet · {rows.length} of {LEAGUE_MAX}
          </span>
          <Rules />
          <form action={leaveLeague} className="mt-6">
            <input type="hidden" name="code" value={league.invite_code} />
            <button type="submit" className="text-sm font-semibold text-red-card underline underline-offset-2">
              Leave {league.name}
            </button>
          </form>
        </aside>
      </div>
    </main>
  );
}
