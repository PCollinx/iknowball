import type { Metadata } from "next";
import Link from "next/link";
import { ShirtBack } from "@/components/daily/ShirtBack";
import { PRIVACY_EMAIL } from "@/lib/site";

// Privacy & data, in plain English (drafted 21 Oct 2026 from what the code
// actually does, checked again and approved by Collins 27 Oct 2026). Not legal advice. Keep it in step
// with the app: a new service or a new kind of data means a new line here and
// a new "last updated" date. Laid out as a team sheet (step 11): numbered
// contents, sections under double rules, the services as shirts.

export const metadata: Metadata = {
  title: "Privacy & data · iKnowBall",
  description: "What iKnowBall collects, why, who it's shared with, and how to get it deleted.",
};

const UPDATED = "27 Oct 2026";

const SECTIONS = [
  ["collect", "What we collect"],
  ["why", "Why"],
  ["seen", "What other players see"],
  ["helpers", "Who helps us run it"],
  ["cookies", "Cookies and storage"],
  ["keep", "How long we keep it"],
  ["choices", "Your choices"],
  ["changes", "Changes"],
] as const;

const HELPERS = [
  ["Supabase", "Database and sign-in"],
  ["Vercel", "Hosting"],
  ["PostHog (EU)", "Usage analytics"],
  ["Sentry", "Error reports"],
  ["Resend", "Sign-in emails"],
  ["Google", "Sign-in, if you choose it"],
] as const;

const link = "font-semibold text-royal underline underline-offset-2";

export default function PrivacyPage() {
  return (
    <main className="mx-auto grid w-full max-w-[560px] flex-1 content-start px-4 pt-5 pb-8 lg:max-w-[1200px] lg:grid-cols-[360px_minmax(0,1fr)] lg:items-start lg:gap-x-14 lg:px-10 lg:pt-8">
      <aside className="[@media(min-width:1024px)_and_(min-height:940px)]:sticky [@media(min-width:1024px)_and_(min-height:940px)]:top-5">
        <div className="flex items-center justify-between gap-3">
          <span className="label">Privacy &amp; data</span>
          <span className="rotate-3 bg-navy px-2.5 py-0.5 font-display text-base whitespace-nowrap text-teal-light uppercase">Updated · {UPDATED}</span>
        </div>
        <h1 className="mt-2 font-display text-[56px] leading-[0.86] uppercase lg:text-[64px]">
          Your data, <span className="text-royal">plainly</span>
        </h1>
        <p className="mt-3 text-lg">
          iKnowBall is an independent football quiz made by Collins Paul. What we collect when you play, why, who helps us run it,
          and how to get your data deleted. No ads, and we never sell your data.
        </p>

        <nav aria-label="Sections" className="mt-[18px] border-[3px] border-navy px-3 pt-2.5 pb-1.5 shadow-[5px_5px_0_var(--color-navy)]">
          <div className="flex justify-between border-b-4 border-double border-navy pb-1">
            <span className="label">Team sheet</span>
            <span className="label">{SECTIONS.length} sections</span>
          </div>
          <ol>
            {SECTIONS.map(([id, title], i) => (
              <li key={id} className="border-b border-track last:border-b-0">
                <a href={`#${id}`} className="grid grid-cols-[28px_minmax(0,1fr)] items-center gap-2 py-1.5 hover:text-royal">
                  <span className="bg-navy text-center font-display text-base leading-6 text-teal-light">{i + 1}</span>
                  <span className="text-[15px] font-semibold">{title}</span>
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <Ask />
      </aside>

      <div className="lg:[&>section:first-child]:mt-0">
        <Section n={1}>
          <Item name="A guest account">
            When you start playing, we create an anonymous account so your Dailies count. It&apos;s an ID, kept in a sign-in
            cookie on your device. No name or email needed.
          </Item>
          <Item name="Your email or Google account, if you save your shirt">
            To keep your shirt on other devices you can add an email address (we send you a sign-in link) or sign in with Google,
            which shares your name, email and profile picture with us.
          </Item>
          <Item name="What you choose to tell us">Your username and the club you support.</Item>
          <Item name="What you play">
            For each Daily: when you started and finished, the answers you typed or tapped (wrong ones too), and your score. For
            Clash: your sprints and the challenge links you make. For the League: the leagues you start or join, and their names.
          </Item>
          <Item name="If you join the waitlist">
            Your email, plus your name, club, league name and how many mates you&apos;d bring, if you fill those in.
          </Item>
          <Item name="How the app is used">
            Pages visited, buttons pressed and your device and browser type, through PostHog analytics. This uses an anonymous
            ID in your browser. We don&apos;t attach your name or email to it.
          </Item>
          <Item name="Error reports">
            When something breaks, the error, the page and your browser type go to Sentry so we can fix it.
          </Item>
          <Item name="Server logs">
            Like most websites, our hosting and database keep short-lived request logs, which include IP addresses.
          </Item>
        </Section>

        <Section n={2}>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>To run the game: start the clock, check your answers, score you and put you on the tables.</li>
            <li>To keep you signed in, and to let you sign in on another device.</li>
            <li>To find and fix bugs, and to see which parts of the game people use.</li>
          </ul>
        </Section>

        <Section n={3}>
          <p>
            Your username (or &quot;Guest&quot; and four characters if you haven&apos;t picked one), your club, your shirt and your
            scores, on today&apos;s table, the Everyone table, your club&apos;s fanbase table, the tables of leagues you&apos;re in
            and the tables of Clash challenges you play.
          </p>
          <ul className="mt-2 list-disc space-y-1.5 pl-5">
            <li>Anyone with your Clash challenge link sees your name and score; anyone with a league&apos;s invite link sees its name, its captain and its players.</li>
            <li>Share cards carry names too: a Clash card names whoever set the challenge.</li>
            <li>
              If you make the week&apos;s team of the week, your username and points are on its card, which we post on our social
              accounts.
            </li>
          </ul>
          <p className="mt-2">Other players never see your email or the answers you typed.</p>
        </Section>

        <Section n={4}>
          <p>These services process data for us, only to provide their part of the app. Some are based outside Nigeria and the UK, so your data may be processed in the EU or the US.</p>
          <ul className="mt-2">
            {HELPERS.map(([name, what]) => (
              <li key={name} className="grid grid-cols-[44px_minmax(0,1fr)] items-center gap-2.5 border-b border-track py-1.5 last:border-b-0">
                <span aria-hidden="true">
                  <ShirtBack lettering="tag" />
                </span>
                <span>
                  <b className="block font-display text-xl leading-none uppercase">{name}</b>
                  <span className="text-sm text-slate">{what}</span>
                </span>
              </li>
            ))}
          </ul>
        </Section>

        <Section n={5}>
          A sign-in cookie, which the app needs to work, and PostHog&apos;s analytics ID, kept in a cookie and your browser&apos;s
          storage. No ad trackers. Clearing your browser data removes them; as a guest, that also loses the shirt on that device.
        </Section>

        <Section n={6}>
          Your account, choices and results stay while your account exists, because the tables and your rating are built from them.
          Analytics, error reports and logs are kept for a limited time by the services above.
        </Section>

        <Section n={7}>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>
              Change your username or club on{" "}
              <Link href="/profile" className={link}>
                your shirt
              </Link>
              .
            </li>
            <li>Ask for a copy of your data, or for your account and everything linked to it to be deleted.</li>
          </ul>
          <p className="mt-3">
            {PRIVACY_EMAIL ? (
              <>
                Email{" "}
                <a href={`mailto:${PRIVACY_EMAIL}`} className={link}>
                  {PRIVACY_EMAIL}
                </a>{" "}
                and we&apos;ll reply within 30 days.
              </>
            ) : (
              <span className="border-l-4 border-red-card pl-2 font-semibold">Contact address to come before launch.</span>
            )}
          </p>
        </Section>

        <Section n={8}>If this changes, we&apos;ll update this page and the date at the top.</Section>
      </div>
    </main>
  );
}

/** "Delete or download": a ticket with the address on its stub. */
function Ask() {
  return (
    <section className="mt-[22px] flex border-[3px] border-navy shadow-[5px_5px_0_var(--color-navy)]">
      <div className="flex-1 bg-teal-light px-3.5 py-3">
        <span className="label">Delete or download</span>
        <b className="mt-1 block font-display text-2xl leading-none uppercase">Email us, we reply within 30 days</b>
      </div>
      {PRIVACY_EMAIL ? (
        <a
          href={`mailto:${PRIVACY_EMAIL}`}
          className="flex max-w-[45%] items-center border-l-[3px] border-dashed border-teal-light bg-navy px-3.5 text-[15px] font-semibold text-white underline underline-offset-2"
        >
          {/* Breaks after the @ when the stub is narrow, never mid-word. */}
          <span>
            {PRIVACY_EMAIL.split("@")[0]}@<wbr />
            {PRIVACY_EMAIL.split("@")[1]}
          </span>
        </a>
      ) : (
        <span className="flex items-center border-l-[3px] border-dashed border-teal-light bg-navy px-3.5 font-display text-lg text-white uppercase">Soon</span>
      )}
    </section>
  );
}

function Section({ n, children }: { n: number; children: React.ReactNode }) {
  const [id, title] = SECTIONS[n - 1];
  return (
    <section id={id} className="mt-[26px] scroll-mt-5">
      <div className="flex items-baseline gap-2.5 border-b-4 border-double border-navy pb-1.5">
        <span className="bg-navy px-[7px] font-display text-xl leading-[26px] text-teal-light">{n}</span>
        <h2 className="font-display text-[30px] leading-none uppercase">{title}</h2>
      </div>
      <div className="mt-2 text-[16px] leading-relaxed">{children}</div>
    </section>
  );
}

function Item({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-track py-2.5 last:border-b-0">
      <h3 className="font-semibold">{name}</h3>
      <p className="mt-0.5 text-navy/85">{children}</p>
    </div>
  );
}
