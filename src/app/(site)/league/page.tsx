import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { ordinal } from "@/components/daily/formats";
import { JoinLeague, StartLeague } from "@/components/league/Forms";
import { LeagueLoading, LeagueMasthead } from "@/components/league/Masthead";
import { weekLabel } from "@/components/league/format";
import { getHub } from "@/lib/league/data";

export const metadata: Metadata = {
  title: "The League · iKnowBall",
  description: "Mini-leagues with your mates, scored every matchweek. Best 5 Dailies and 3 Clash sprints count.",
};

export default function LeaguePage() {
  return (
    <Suspense fallback={<LeagueLoading />}>
      <Hub />
    </Suspense>
  );
}

function Line({ href, name, sub, place, small }: { href: string; name: string; sub: string; place: string; small: string }) {
  return (
    <li>
      <Link href={href} className="grid grid-cols-[1fr_auto_auto] items-center gap-2.5 border-b border-track py-3">
        <span className="min-w-0">
          <span className="block truncate font-display text-[26px] leading-[0.95] uppercase">{name}</span>
          <span className="block text-[13px] text-navy/65">{sub}</span>
        </span>
        <span className="text-right font-display text-[30px] leading-none text-royal tabular-nums">
          {place}
          <small className="block font-sans text-[11px] leading-tight font-semibold tracking-widest text-navy/60">{small}</small>
        </span>
        <span aria-hidden="true" className="font-display text-xl">
          →
        </span>
      </Link>
    </li>
  );
}

// Reads the session and the week, so it renders per request.
async function Hub() {
  await connection();
  const hub = await getHub();
  const { everyone, club, fanbase } = hub;
  const share = everyone.position && everyone.players >= 20 ? Math.max(1, Math.ceil((everyone.position / everyone.players) * 100)) : null;

  return (
    <main className="mx-auto w-full flex-1 max-w-[560px] px-4 pb-10 lg:max-w-[1040px]">
      <LeagueMasthead right={weekLabel(hub.week)} />
      <div className="lg:grid lg:grid-cols-[1fr_380px] lg:gap-10">
        <section>
          <h1 className="mt-4 font-display text-[56px] leading-[0.9] uppercase">
            Your <span className="text-royal">leagues</span>
          </h1>
          <p className="mt-1.5 text-navy/75">This week&apos;s places. Your best 5 Dailies and best 3 Clash sprints count, and tables lock Sunday at midnight.</p>
          <ul className="mt-2">
            {hub.leagues.map((l) => (
              <Line
                key={l.league.id}
                href={`/league/${l.league.invite_code}`}
                name={l.league.name}
                sub={`${l.members} ${l.members === 1 ? "player" : "players"} · ${l.points} pts`}
                place={l.position ? ordinal(l.position) : "–"}
                small={`of ${l.members}`}
              />
            ))}
            <Line
              href="/league/everyone"
              name="Everyone"
              sub={`Global table · ${everyone.players.toLocaleString("en-GB")} ${everyone.players === 1 ? "player" : "players"}`}
              place={everyone.position ? ordinal(everyone.position) : "–"}
              small={everyone.position ? (share ? `top ${share}%` : `of ${everyone.players}`) : "not played"}
            />
            {club && (
              <Line
                href="/league/fans"
                name={`${club.name} fans`}
                sub={fanbase.position ? `Fanbase table · ${ordinal(fanbase.position)} of ${fanbase.clubs} clubs` : "Fanbase table · needs 25 fans playing"}
                place={fanbase.position ? ordinal(fanbase.position) : "–"}
                small="club"
              />
            )}
          </ul>
          {!hub.leagues.length && (
            <p className="mt-3 border-l-[3px] border-teal pl-3 text-[15px]">
              No league yet. Start one and send the code to the group chat, or join with a code a mate sent you.
            </p>
          )}
          {!club && (
            <p className="mt-3 text-[15px]">
              Pick a club on your{" "}
              <Link href="/profile" className="font-semibold text-royal underline underline-offset-2">
                profile
              </Link>{" "}
              to play for its fanbase.
            </p>
          )}
        </section>
        <aside className="mt-6 grid grid-cols-[minmax(0,1fr)] content-start gap-3 lg:mt-[22px]">
          <StartLeague />
          <JoinLeague />
          <Link href="/daily" className="block bg-navy p-3 text-center font-display text-[22px] text-white uppercase">
            Play today&apos;s Daily
          </Link>
        </aside>
      </div>
    </main>
  );
}
