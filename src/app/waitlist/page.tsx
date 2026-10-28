import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { SiteFooter } from "@/components/nav/SiteFooter";
import { Logo } from "@/components/nav/SiteNav";
import { TeamSheet } from "@/components/waitlist/TeamSheet";
import { isTestSite } from "@/lib/daily/sample";
import { publicEnv } from "@/lib/env";
import { clubChoices } from "@/lib/profile/data";
import { createAdminClient } from "@/lib/supabase/admin";
import { GATES_OPEN_LABEL, waitlistUp } from "@/lib/waitlist";

// The waitlist (step 13 of docs/redesign-plan.md, option A "Team sheet"). On
// the live site the proxy shows it in place of the games from 1 Nov until the
// gates open (src/lib/waitlist.ts); test sites keep it here at /waitlist. It
// sits outside the (site) group: the navbar's sections lead to games that
// aren't open yet, so the top is just the mark and the kick-off date.

export const metadata: Metadata = {
  title: "iKnowBall · Think you know ball?",
  description: "A daily football quiz, 60-second duels and mini-leagues with your mates. Put your name down before kick-off.",
};

/** Below this, a sign-up count reads as empty rather than busy, so it isn't shown. */
const SHOW_COUNT_FROM = 25;

const GAMES = [
  ["The Daily", "One try a day. Name them, put them in order."],
  ["Clash", "Higher or lower, 60 seconds, send the link."],
  ["The League", "Your mates, one table, every week."],
] as const;

export default function WaitlistPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b-[4px] border-double border-navy">
        <div className="mx-auto flex max-w-[1184px] items-center justify-between gap-3 px-4 py-3">
          <span className="flex items-center gap-2 lg:gap-2.5">
            <Logo />
            <span className="font-display text-[26px] leading-none lg:text-[32px]">
              iKnow<span className="text-teal">Ball</span>
            </span>
          </span>
          <span className="label bg-navy px-2 py-[5px] text-[10px] text-teal-light lg:px-2.5 lg:py-[7px] lg:text-[11px]">Kick-off {GATES_OPEN_LABEL}</span>
        </div>
      </header>

      <main className="group/wait mx-auto grid w-full max-w-[1184px] flex-1 content-start gap-y-[18px] px-4 pt-[18px] lg:grid-cols-[minmax(0,1fr)_480px] lg:gap-x-14 lg:pt-9 xl:grid-cols-[minmax(0,1fr)_520px] xl:gap-x-16">
        {/* Signed up, phones drop the pitch so "You're No. N" is the first thing on screen. */}
        <section className="max-lg:group-has-[[data-signed]]/wait:hidden">
          <span className="label text-teal">The team sheet is open</span>
          <h1 className="mt-2 font-display text-[64px] leading-[0.82] uppercase lg:mt-2.5 lg:text-[104px] xl:text-[120px]">
            Think you <br className="lg:hidden" />
            know <span className="text-teal">ball?</span>
          </h1>
          <p className="mt-2.5 max-w-[520px] text-base leading-snug lg:mt-4 lg:text-lg">
            A daily football quiz, 60-second duels and mini-leagues with your mates. Put your name down and get your shirt printed before kick-off.
          </p>
          <ul className="mt-4 flex gap-1.5 lg:mt-[22px] lg:gap-2.5">
            {GAMES.map(([game, line]) => (
              <li key={game} className="min-w-0 flex-1 border-2 border-dashed border-track p-1.5">
                <div className="flex h-full flex-col gap-1 border-[2.5px] border-navy bg-white px-2 pt-2 pb-2.5 shadow-[3px_3px_0_var(--color-navy)]">
                  <span className="font-display text-lg leading-[0.85] uppercase lg:text-2xl">{game}</span>
                  <span className="text-xs leading-[1.3] lg:text-sm">{line}</span>
                </div>
              </li>
            ))}
          </ul>
          <Suspense fallback={null}>
            <TestLinks />
          </Suspense>
        </section>

        <section className="lg:self-start">
          <Suspense fallback={<div className="h-[440px] border-[2.5px] border-navy bg-mist" aria-busy="true" />}>
            <Sheet />
          </Suspense>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

// Reads the club list, the count and the site address on each request.
async function Sheet() {
  await connection();
  // After the gates open the live site sends anyone left here to the games.
  if (!isTestSite() && !waitlistUp()) redirect("/");
  const [clubs, { count }] = await Promise.all([clubChoices(), createAdminClient().from("waitlist").select("id", { count: "exact", head: true })]);
  return <TeamSheet clubs={clubs} count={count && count >= SHOW_COUNT_FROM ? count : null} siteUrl={publicEnv().NEXT_PUBLIC_SITE_URL} />;
}

/** Test sites never switch to the waitlist, so the games stay a tap away. */
async function TestLinks() {
  await connection();
  if (!isTestSite()) return null;
  return (
    <p className="mt-5 border-2 border-dashed border-red-card p-3 text-sm font-semibold text-red-card">
      Test site only: the live site shows this page from 1 Nov. The games stay open here:{" "}
      <Link href="/" className="underline underline-offset-[3px]">
        home
      </Link>
      .
    </p>
  );
}
