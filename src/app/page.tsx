import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { ShirtBack, type Kit } from "@/components/daily/ShirtBack";
import { WaitlistForm } from "@/components/waitlist/WaitlistForm";
import { isTestSite } from "@/lib/daily/sample";
import { publicEnv } from "@/lib/env";
import { clubChoices } from "@/lib/profile/data";
import { createAdminClient } from "@/lib/supabase/admin";
import { TIERS } from "@/lib/profile/stats";

// The front page until launch (Fri 27 Nov 2026): what iKnowBall is, and the
// waitlist. Opens to the public on Nov 1, when the name is revealed on X.

/** Below this, a sign-up count reads as empty rather than busy, so it isn't shown. */
const SHOW_COUNT_FROM = 25;

/** The tier ladder as a run of shirts, each a step up from the last: plastic
 * white, then the app's own colours, up to teal for the Ball Gods. */
const TIER_KITS: Kit[] = [
  { shirt: "#FFFFFF", number: "#0C1330", trim: "#DCE3F5" },
  { shirt: "#EEF2FB", number: "#1F48D6", trim: "#1F48D6" },
  { shirt: "#1F48D6", number: "#FFFFFF", trim: "#7FE3E0" },
  { shirt: "#1F48D6", number: "#FFFFFF", trim: "#00A3A3", pattern: "sleeves", collar: "polo" },
  { shirt: "#0C1330", number: "#FFFFFF", trim: "#00A3A3", pattern: "pinstripes", collar: "polo" },
  { shirt: "#00A3A3", number: "#FFFFFF", trim: "#0C1330", pattern: "yoke", collar: "polo" },
];

const PILLARS = [
  { name: "The Daily", line: "One try a day, themed on the weekend's fixtures. Name them, order them, beat the clock. Closes at midnight." },
  { name: "Clash", line: "Sixty-second duels. Higher or lower, this player or that one. Send the link and settle it." },
  { name: "The League", line: "Your group chat, one table. Every matchweek, best five days count. No more arguing about who knows ball." },
];

export default function Home() {
  return (
    <main className="mx-auto min-h-dvh max-w-[1200px] px-4 pb-10 lg:grid lg:grid-cols-[minmax(0,1fr)_460px] lg:gap-x-14 lg:px-8">
      <div className="flex items-center justify-between gap-2 border-b border-navy pt-3.5 pb-2 lg:col-span-2">
        <span className="font-display text-2xl leading-none uppercase">
          <span className="text-royal">i</span>KnowBall
        </span>
        <span className="label">Kick-off Fri 27 Nov</span>
      </div>

      <section className="lg:pt-2">
        <h1 className="border-b-[3px] border-double border-navy pt-5 pb-4 font-display text-[76px] leading-[0.82] uppercase sm:text-[104px] lg:text-[136px]">
          Think you know <span className="text-royal">ball?</span>
        </h1>
        <p className="mt-4 max-w-[34ch] text-xl font-semibold">Prove it. One rating out of 10, six tiers, and a table that settles every argument.</p>

        <ol className="mt-5 grid grid-cols-3 gap-x-2 gap-y-3 sm:grid-cols-6" aria-label="The tiers">
          {TIERS.map((t, i) => (
            <li key={t.name}>
              <ShirtBack kit={TIER_KITS[i]} lettering="tag" name={t.name} num={i === 0 ? "Start here" : `${t.from.toFixed(1)}+`} />
            </li>
          ))}
        </ol>

        <ol className="mt-6 border-t-2 border-navy">
          {PILLARS.map((p, i) => (
            <li key={p.name} className="grid grid-cols-[40px_1fr] gap-x-2 border-b border-track py-3">
              <span className="font-display text-[32px] leading-none text-royal">{i + 1}</span>
              <span>
                <span className="block font-display text-[28px] leading-none uppercase">{p.name}</span>
                <span className="mt-1 block text-[15px] text-navy/80">{p.line}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-8 lg:sticky lg:top-4 lg:mt-0 lg:self-start lg:pt-5">
        <div className="border-[3px] border-navy p-4">
          <div className="flex items-baseline justify-between gap-2 border-b-[3px] border-double border-navy pb-2">
            <h2 className="font-display text-[40px] leading-[0.9] uppercase">Team sheet</h2>
            <Suspense fallback={null}>
              <SignedCount />
            </Suspense>
          </div>
          <p className="mt-2 mb-4 text-[15px]">Get on the list before kick-off. Early names get into the beta first.</p>
          <Suspense fallback={<div className="h-[420px] bg-mist" aria-busy="true" />}>
            <Sheet />
          </Suspense>
        </div>
        <Suspense fallback={null}>
          <TestLinks />
        </Suspense>
      </section>
    </main>
  );
}

// Reads the club list and the site address on each request.
async function Sheet() {
  await connection();
  return <WaitlistForm clubs={await clubChoices()} siteUrl={publicEnv().NEXT_PUBLIC_SITE_URL} />;
}

async function SignedCount() {
  await connection();
  const { count } = await createAdminClient().from("waitlist").select("id", { count: "exact", head: true });
  if (!count || count < SHOW_COUNT_FROM) return null;
  return <span className="label text-teal">{count} signed</span>;
}

/** Previews and local runs keep a way into the game while the front page is the waitlist. */
async function TestLinks() {
  await connection();
  if (!isTestSite()) return null;
  return (
    <p className="mt-3 border-2 border-dashed border-red-card p-3 text-sm font-semibold text-red-card">
      Test site only:{" "}
      <Link href="/daily" className="underline underline-offset-[3px]">
        play the Daily
      </Link>{" "}
      ·{" "}
      <Link href="/profile" className="underline underline-offset-[3px]">
        your shirt
      </Link>
    </p>
  );
}
