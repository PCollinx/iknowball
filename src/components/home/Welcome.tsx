import Link from "next/link";
import { LEAGUE_MAX } from "@/lib/league/data";
import { RATING_DAYS, ratingColours } from "@/lib/profile/rating";
import { PLACEMENT_DAYS, TIERS } from "@/lib/profile/stats";
import { SOCIAL } from "@/lib/site";

// 00 Home: the welcome (Collins, 11 Nov 2026, option B "The ground tour" of
// https://claude.ai/artifact/25xt32QEwHBPensK55ddWX, after beta players kept
// asking how to play). A welcome with one Play button, the four parts of the
// app as tour tickets (each ticket is the link), how a week scores, the tiers
// and the questions. The same for everyone, so it renders once at build. A
// player who has played goes from / straight to the Daily (src/proxy.ts);
// the navbar's 00 Home opens it at /welcome. Keep the answers in step with
// the rules in CLAUDE.md.

const link = "font-semibold text-royal underline underline-offset-2";

const STOPS = [
  {
    n: "01",
    when: "Every day",
    title: "The Daily",
    href: "/daily",
    go: "Play",
    lead: "One go a day, the same for everyone, themed on the day's big fixture.",
    facts: [
      "1st half: name every player who fits, or tap the right one of four",
      "2nd half: put them in order, or pick when they were there",
      "Scored out of 100. New at midnight Nigeria time",
    ],
  },
  {
    n: "02",
    when: "Any time",
    title: "Clash",
    href: "/clash",
    go: "Sprint",
    lead: "60 seconds of Higher or Lower on today's stat: who scored more, who's taller.",
    facts: [
      "Tap the player with more. A wrong call costs 5 seconds",
      "Play as often as you like; your best 3 a week count",
      "Send the link and a friend gets the same players",
    ],
  },
  {
    n: "03",
    when: "Every week",
    title: "The League",
    href: "/league",
    go: "Join",
    lead: "Your group chat's table. Start a league, send the code, settle it every Sunday.",
    facts: [
      "Weeks run Monday to Sunday, out of 600",
      `Up to ${LEAGUE_MAX} players a league`,
      "Plus Team of the week and your club's away end",
    ],
  },
  {
    n: "04",
    when: "Yours",
    title: "Your shirt",
    href: "/profile",
    go: "Wear it",
    lead: "Your rating out of 10, your tier, your streak and your club's kit.",
    facts: [
      "Save it with email or Google to play on any phone",
      "Put it on your home screen and turn on the whistle",
      "Switch club once a season",
    ],
  },
];

/** An example week: the struck-out day is the worst of the 6 played, "–" a day missed. */
const WEEK = [
  ["Mon", 84],
  ["Tue", 41],
  ["Wed", 90],
  ["Thu", null],
  ["Fri", 77],
  ["Sat", 88],
  ["Sun", 81],
] as const;
const DROPPED = "Tue";
const CLASH = 92;
const DAILIES = WEEK.reduce(
  (sum, [day, p]) => (p === null || day === DROPPED ? sum : sum + p),
  0,
);

const FAQ: { q: string; a: React.ReactNode }[] = [
  {
    q: "Do I need an account?",
    a: "No. You play as a guest straight away. Save your shirt with email or Google (on Your shirt) to keep your scores and play on another phone.",
  },
  {
    q: "When is the next Daily?",
    a: "Every day at midnight Nigeria time (WAT), all year, international breaks included. The Daily shows how long today's has left.",
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
    q: "How do I join a friend's league?",
    a: (
      <>
        Open the link they send you, or type their code on{" "}
        <Link href="/league" className={link}>
          The League
        </Link>
        . A league holds up to {LEAGUE_MAX} players.
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
        Yes. On{" "}
        <Link href="/profile" className={link}>
          Your shirt
        </Link>
        , “On your phone” installs it and “The whistle” turns on reminders for
        the Daily, your challenges and your leagues.
      </>
    ),
  },
  {
    q: "Something looks wrong. Who do I tell?",
    a: (
      <>
        Message us on X at{" "}
        <a href={SOCIAL.x.url} className={link}>
          {SOCIAL.x.handle}
        </a>
        .
      </>
    ),
  },
];

export function Welcome() {
  return (
    <main className="mx-auto w-full max-w-[1184px] flex-1 px-4 pb-10">
      {/* Phone: one column in reading order. Desktop: the welcome and the scoring on the left, the scoring
          pushed down so it ends level with the questions; the tour and the questions on the right. */}
      <div className="flex flex-col lg:grid lg:grid-cols-12 lg:gap-9">
        <div className="contents lg:col-span-5 lg:flex lg:flex-col">
          <Hello />
          <Scoring />
        </div>
        <div className="contents lg:col-span-7 lg:block">
          <Tour />
          <Questions />
        </div>
      </div>
      <KickOff />
    </main>
  );
}

function Heading({
  children,
  aside,
}: {
  children: React.ReactNode;
  aside?: string;
}) {
  return (
    <h2 className="flex items-baseline justify-between gap-3 border-b-4 border-double border-navy pb-1.5 font-display text-[34px] leading-[0.9] uppercase lg:text-[40px]">
      {children}
      {aside && (
        <span className="label text-[10px] text-slate lg:text-[11px]">
          {aside}
        </span>
      )}
    </h2>
  );
}

function PlayButton({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/daily"
      className={`btn-teal btn-press flex items-center justify-between gap-3 px-3 py-2.5 font-display text-[21px] leading-none uppercase lg:text-[26px] ${className}`}
    >
      Play today&apos;s Daily <span aria-hidden="true">→</span>
    </Link>
  );
}

function Hello() {
  return (
    <section className="order-1 pt-4 lg:pt-7">
      <span className="label text-royal">Welcome to iKnowBall</span>
      <h1 className="mt-1 font-display text-[42px] leading-[0.88] uppercase lg:text-[72px] lg:leading-[0.86]">
        Think you know ball?
      </h1>
      <p className="mt-2.5 text-[15px] leading-snug lg:mt-3.5 lg:max-w-[34ch] lg:text-[17px]">
        Three football quiz games tailored to the fixtures of each matchweek.
        Play the Daily once a day, race the clock on Clash as often as you like,
        and beat your friends in a league. No sign-up needed: tap Play and start
        as a guest.
      </p>
      <PlayButton className="mt-3.5 lg:mt-5 lg:max-w-[320px]" />
    </section>
  );
}

function Tour() {
  return (
    <section className="order-2 mt-7 lg:mt-7">
      <Heading aside="4 stops">The tour</Heading>
      <ol className="mt-3 grid gap-3 lg:mt-3.5 lg:grid-cols-2 lg:gap-4">
        {STOPS.map((s, i) => (
          <li key={s.n}>
            <Link
              href={s.href}
              className="btn-press grid h-full grid-cols-[minmax(0,1fr)_66px] border-[2.5px] border-navy bg-white shadow-[3px_3px_0_var(--color-navy)] lg:grid-cols-[minmax(0,1fr)_76px]"
            >
              <span className="min-w-0 px-2.5 py-2.5 lg:px-3">
                <span className="label block text-[10px] text-teal lg:text-[11px]">
                  Stop {s.n} · {s.when}
                </span>
                <span className="mt-0.5 block font-display text-[26px] leading-[0.9] uppercase lg:text-[30px]">
                  {s.title}
                </span>
                <span className="mt-1 block text-[13px] leading-snug lg:text-sm">
                  {s.lead}
                </span>
                <ul className="mt-1.5 grid gap-0.5">
                  {s.facts.map((f) => (
                    <li
                      key={f}
                      className="relative pl-3.5 text-[12.5px] leading-snug text-slate lg:text-[13px]"
                    >
                      <span
                        aria-hidden="true"
                        className="absolute top-[6px] left-0 size-1.5 bg-navy"
                      />
                      {f}
                    </li>
                  ))}
                </ul>
              </span>
              <span
                className={`grid place-items-center border-l-[2.5px] border-dashed border-navy text-center ${i === 0 ? "bg-teal-light text-navy" : "bg-navy text-teal-light"}`}
              >
                <span>
                  <span className="block font-display text-[30px] leading-none">
                    {s.n}
                  </span>
                  <span
                    className={`label mt-1 block text-[9.5px] ${i === 0 ? "text-navy" : "text-white"}`}
                  >
                    {s.go} →
                  </span>
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Scoring() {
  return (
    <div className="order-3 lg:mt-auto lg:pt-9">
      <section className="mt-7 lg:mt-0">
        <Heading>How a week scores</Heading>
        <div className="mt-3 bg-navy p-3 text-white shadow-[4px_4px_0_var(--color-teal-light)]">
          <div className="flex items-baseline justify-between">
            <span className="label text-[11px] text-sky">A week · example</span>
            <span className="font-display text-[46px] leading-none text-teal-light tabular-nums">
              {DAILIES + CLASH}
              <span className="text-[22px] text-white"> /600</span>
            </span>
          </div>
          <ol className="mt-2.5 grid grid-cols-7 gap-1">
            {WEEK.map(([day, p]) => (
              <li
                key={day}
                className={`border-2 border-sky pt-0.5 pb-1 text-center ${day === DROPPED ? "line-through opacity-45" : ""}`}
                aria-label={
                  p === null
                    ? `${day}: missed`
                    : day === DROPPED
                      ? `${day}: ${p}, dropped`
                      : `${day}: ${p}`
                }
              >
                <span
                  className={`block font-display text-[17px] tabular-nums ${p === null ? "opacity-50" : ""}`}
                >
                  {p ?? "–"}
                </span>
                <span className="label block text-[9px] opacity-80">{day}</span>
              </li>
            ))}
          </ol>
          <div
            aria-hidden="true"
            className="mt-2.5 flex h-3.5 border-2 border-white"
          >
            <span className="flex-[5] bg-royal" />
            <span className="flex-1 bg-teal-light" />
          </div>
          <div className="mt-1 flex justify-between text-[11px]">
            <span>Best 5 Dailies · {DAILIES} of 500</span>
            <span>Clash · {CLASH}</span>
          </div>
        </div>
        <p className="mt-2 text-[13.5px] leading-snug">
          Your worst day and a missed one don&apos;t count. Clash adds the right
          calls from your best 3 sprints, up to 100.
        </p>
      </section>

      <section className="mt-7">
        <Heading>Your tier</Heading>
        <p className="mt-2 text-[13.5px] leading-snug">
          Your rating comes from your last {RATING_DAYS} days of Dailies,
          coloured like a match rating. After {PLACEMENT_DAYS} Dailies
          you&apos;re placed.
        </p>
        <ol className="mt-2.5 grid grid-cols-6 border-[2.5px] border-navy">
          {TIERS.map((t, i) => {
            const top = i === TIERS.length - 1;
            const c = ratingColours(Number.isFinite(t.from) ? t.from : 0);
            return (
              <li
                key={t.name}
                className={`flex min-w-0 flex-col items-center justify-between gap-1.5 px-0.5 py-1.5 text-center ${top ? "bg-navy text-teal-light" : "border-r-[1.5px] border-navy"}`}
              >
                <span className="flex min-h-[2em] items-center font-display text-[10.5px] leading-none uppercase min-[400px]:text-xs lg:text-[15px]">
                  {t.name}
                </span>
                <span
                  className={`grid h-[22px] w-[34px] place-items-center border-[1.5px] font-display text-[13px] leading-none tabular-nums ${top ? "border-teal-light" : "border-navy"}`}
                  style={{ backgroundColor: c.fill, color: c.text }}
                >
                  {Number.isFinite(t.from)
                    ? t.from.toFixed(1)
                    : `<${TIERS[1].from}`}
                </span>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}

function Questions() {
  return (
    <section className="order-4 mt-7 lg:mt-9">
      <Heading>Questions</Heading>
      <ul data-faq className="mt-1 lg:columns-2 lg:gap-7">
        {FAQ.map((f) => (
          <li key={f.q} className="break-inside-avoid border-b border-navy">
            <details className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 py-2.5 text-[14px] font-semibold lg:text-[15px] [&::-webkit-details-marker]:hidden">
                {f.q}
                <span
                  aria-hidden="true"
                  className="font-display text-2xl leading-none transition-transform duration-300 group-open:rotate-45 motion-reduce:transition-none"
                >
                  +
                </span>
              </summary>
              <p className="-mt-0.5 pb-3 text-[13px] leading-relaxed text-slate lg:text-sm">
                {f.a}
              </p>
            </details>
          </li>
        ))}
      </ul>
    </section>
  );
}

function KickOff() {
  return (
    <section className="mt-8 grid gap-3 border-[2.5px] border-navy bg-mist p-3 lg:mt-9 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-center lg:gap-6 lg:px-5 lg:py-4">
      <div>
        <h2 className="font-display text-[30px] leading-[0.9] uppercase lg:text-[44px]">
          Kick-off
        </h2>
        <p className="mt-1 text-[13.5px] lg:text-[15px]">
          The tour&apos;s over. Today&apos;s Daily is on until midnight, then
          Clash.
        </p>
      </div>
      <PlayButton />
    </section>
  );
}
