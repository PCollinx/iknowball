import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/nav/SiteFooter";
import { SiteNav } from "@/components/nav/SiteNav";
import { PRIVACY_EMAIL } from "@/lib/site";

// Privacy & data, in plain English (drafted 21 Oct 2026 from what the code
// actually does). A draft for Collins to review before launch: it is not legal
// advice. Keep it in step with the app: a new service or a new kind of data
// means a new line here and a new "last updated" date.

export const metadata: Metadata = {
  title: "Privacy & data · iKnowBall",
  description: "What iKnowBall collects, why, who it's shared with, and how to get it deleted.",
};

const UPDATED = "21 Oct 2026";

export default function PrivacyPage() {
  return (
    <>
      <SiteNav />
      <main className="mx-auto max-w-[720px] px-4 pb-4 lg:px-0">
        <div className="flex items-center justify-between gap-3 border-b-[3px] border-double border-navy pt-6 pb-2">
          <span className="label whitespace-nowrap">Privacy &amp; data</span>
          <span className="label shrink-0 bg-teal-light px-2 py-0.5">Draft · {UPDATED}</span>
        </div>
        <h1 className="mt-4 font-display text-[48px] leading-[0.88] uppercase lg:text-[72px]">
          Your data, <span className="text-royal">plainly</span>
        </h1>
        <p className="mt-4 text-lg">
          iKnowBall is an independent football quiz made by Collins Paul. This page says what we collect when you play, why, who
          helps us run it, and how to get your data deleted. No ads, and we never sell your data.
        </p>

        <Section title="What we collect">
          <Item name="A guest account">
            When you start playing, we create an anonymous account so your Dailies count. It&apos;s an ID, kept in a sign-in
            cookie on your device. No name or email needed.
          </Item>
          <Item name="Your email or Google account, if you save your shirt">
            To keep your shirt on other devices you can add an email address (we send you a sign-in link) or sign in with Google,
            which shares your name and email with us.
          </Item>
          <Item name="What you choose to tell us">Your username and the club you support.</Item>
          <Item name="What you play">
            For each Daily: when you started and finished, the answers you typed or tapped, and your score. For Clash: your
            sprints and the challenge links you make. For the League: the leagues you start or join.
          </Item>
          <Item name="How the app is used">
            Pages visited, buttons pressed and your device and browser type, through PostHog analytics. This uses an anonymous
            ID in your browser&apos;s storage. We don&apos;t attach your name or email to it.
          </Item>
          <Item name="Error reports">
            When something breaks, the error, the page and your browser type go to Sentry so we can fix it.
          </Item>
          <Item name="Server logs">
            Like most websites, our hosting and database keep short-lived request logs, which include IP addresses.
          </Item>
        </Section>

        <Section title="Why">
          <ul className="list-disc space-y-1.5 pl-5">
            <li>To run the game: start the clock, check your answers, score you and put you on the tables.</li>
            <li>To keep you signed in, and to let you sign in on another device.</li>
            <li>To find and fix bugs, and to see which parts of the game people use.</li>
          </ul>
        </Section>

        <Section title="What other players see">
          Your username (or &quot;Guest&quot; and four characters if you haven&apos;t picked one), your club, your shirt and your
          scores, on today&apos;s table, the Everyone table, your club&apos;s fanbase table, the tables of leagues you&apos;re
          in and the tables of Clash challenges you play. Other players never see your email or the answers you typed.
        </Section>

        <Section title="Who helps us run it">
          <p>These services process data for us, only to provide their part of the app:</p>
          <ul className="mt-2 space-y-1.5">
            {[
              ["Supabase", "database and sign-in"],
              ["Vercel", "hosting"],
              ["PostHog (EU)", "usage analytics"],
              ["Sentry", "error reports"],
              ["Resend", "sign-in emails"],
              ["Google", "sign-in, if you choose it"],
            ].map(([name, what]) => (
              <li key={name} className="flex justify-between gap-3 border-b border-track py-1.5">
                <span className="font-semibold">{name}</span>
                <span className="text-right text-navy/80">{what}</span>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Cookies and storage">
          A sign-in cookie, which the app needs to work, and PostHog&apos;s analytics ID in your browser&apos;s storage. Clearing
          your browser data removes both; as a guest, that also loses the shirt on that device.
        </Section>

        <Section title="How long we keep it">
          Your account, choices and results stay while your account exists, because the tables and your rating are built from
          them. Analytics, error reports and logs are kept for a limited time by the services above.
        </Section>

        <Section title="Your choices">
          <ul className="list-disc space-y-1.5 pl-5">
            <li>
              Change your username or club on <Link href="/profile" className="font-semibold text-royal underline underline-offset-2">your shirt</Link>.
            </li>
            <li>Ask for a copy of your data, or for your account and everything linked to it to be deleted.</li>
          </ul>
          <p className="mt-3">
            {PRIVACY_EMAIL ? (
              <>
                Email{" "}
                <a href={`mailto:${PRIVACY_EMAIL}`} className="font-semibold text-royal underline underline-offset-2">
                  {PRIVACY_EMAIL}
                </a>{" "}
                and we&apos;ll reply within 30 days.
              </>
            ) : (
              <span className="border-l-4 border-red-card pl-2 font-semibold">Contact address to come before launch.</span>
            )}
          </p>
        </Section>

        <Section title="Changes">
          If this changes, we&apos;ll update this page and the date at the top.
        </Section>
      </main>
      <SiteFooter />
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8 border-t-2 border-navy pt-3">
      <h2 className="mb-2 font-display text-[30px] leading-none uppercase">{title}</h2>
      <div className="text-[16px] leading-relaxed">{children}</div>
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
