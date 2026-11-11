import Link from "next/link";
import { TeamSheet } from "@/components/sheet/TeamSheet";
import { SOCIAL } from "@/lib/site";

// How it works and the FAQ, at the foot of home (Collins, 11 Nov 2026: beta
// players kept asking how to play; the navbar's 00 Home leads here). The
// three games on a team sheet, then the questions as a ruled list that opens
// one answer at a time (<details>, no script). Keep the answers in step with
// the rules in CLAUDE.md.

const GAMES = [
  {
    title: "The Daily",
    text: "One go a day, in two halves. The 1st half: name every player who fits, or tap the right one of four. The 2nd half: put them in order, or pick when they were there. Both are timed. A new Daily drops at midnight Nigeria time.",
    value: "/100",
  },
  {
    title: "Clash",
    text: "60 seconds of Higher or Lower on today's stat. Tap the player with more. A wrong call costs you 5 seconds. Play as often as you like, and send the link so a mate gets the same players.",
    value: "60s",
  },
  {
    title: "The League",
    text: "Start a league and send the code, or join a mate's. Weeks run Monday to Sunday: your best 5 Dailies (up to 500) plus your best 3 Clash sprints (up to 100).",
    value: "/600",
  },
  {
    title: "Your rating",
    text: "Out of 10, from your Dailies over the last 30 days played, recent days counting most. After 3 Dailies you get a tier, from Plastic up to Ball God.",
    value: "/10",
  },
];

const FAQ: { q: string; a: React.ReactNode }[] = [
  {
    q: "Do I need an account?",
    a: "No. You play as a guest straight away. Save your shirt with email or Google (on Your shirt) to keep your scores and play on another phone.",
  },
  {
    q: "When is the next Daily?",
    a: "Every day at midnight Nigeria time (WAT), all year, international breaks included. The countdown on the Daily's sticker shows how long today's has left.",
  },
  {
    q: "Can I play the Daily again?",
    a: "No, one go a day for everyone, so the table is fair. Clash has no limit: only your best 3 sprints of the week count.",
  },
  {
    q: "Does the clock start when I tap Kick off?",
    a: "No, it starts when the round is on your screen, so a slow connection doesn't eat your time.",
  },
  {
    q: "What if I spell a name wrong?",
    a: "Small typos are fine, and so are the names players are known by. If it's close enough, it counts.",
  },
  {
    q: "I missed a day. Does it hurt my rating?",
    a: "No. Missed days cost nothing; your rating comes from the days you played. Your League week counts your best 5 of 7 days, so a day off is covered too.",
  },
  {
    q: "How does Clash score?",
    a: "A point for every right call. A wrong one costs 5 seconds off the clock. If the two players are level, either answer is right.",
  },
  {
    q: "How do I join a mate's league?",
    a: (
      <>
        Open the link they send you, or type their code on <Link href="/league" className="font-semibold text-royal underline underline-offset-2">The League</Link>. A league holds up to 50 players.
      </>
    ),
  },
  {
    q: "Can I change my club?",
    a: "Once a season. Your club dresses your shirt and puts you in the fanbase table; it never changes your questions or your score.",
  },
  {
    q: "Where do the questions come from?",
    a: "Club records and match data from public football sources, checked before each day goes out. The answers always come from the data.",
  },
  {
    q: "Can I put it on my home screen and get reminders?",
    a: (
      <>
        Yes. On <Link href="/profile" className="font-semibold text-royal underline underline-offset-2">Your shirt</Link>, “On your phone” installs it and “The whistle” turns on reminders for the Daily, your challenges and your leagues.
      </>
    ),
  },
  {
    q: "Something looks wrong. Who do I tell?",
    a: (
      <>
        Message us on X at{" "}
        <a href={SOCIAL.x.url} className="font-semibold text-royal underline underline-offset-2">
          {SOCIAL.x.handle}
        </a>
        .
      </>
    ),
  },
];

export function HowItWorks() {
  return (
    <div id="how-it-works" className="mt-10 grid scroll-mt-28 gap-8 lg:mt-14 lg:grid-cols-12 lg:gap-9">
      <section className="lg:col-span-5">
        <h2 className="border-b-4 border-double border-navy pb-2 font-display text-[40px] leading-[0.9] uppercase lg:text-[48px]">How it works</h2>
        <p className="mt-2.5 text-sm leading-snug lg:text-[15px]">Three games, one rating. Ten minutes a day.</p>
        <TeamSheet
          name="The rules"
          tag="Three games"
          className="mt-3"
          rows={GAMES.map((g) => ({ title: g.title, text: g.text, value: <span className="font-display text-xl leading-none lg:text-2xl">{g.value}</span> }))}
        />
      </section>

      <section className="lg:col-span-7">
        <h2 className="border-b-4 border-double border-navy pb-2 font-display text-[40px] leading-[0.9] uppercase lg:text-[48px]">Questions</h2>
        <ul className="mt-3 border-t-[3px] border-navy">
          {FAQ.map((f) => (
            <li key={f.q} className="border-b border-navy">
              <details className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 py-3 font-semibold [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <span aria-hidden="true" className="font-display text-2xl leading-none transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="pb-3.5 text-sm leading-relaxed text-slate lg:text-[15px]">{f.a}</p>
              </details>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
