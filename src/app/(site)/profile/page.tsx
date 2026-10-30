import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { signOut } from "@/app/(site)/profile/actions";
import { ClubSection } from "@/components/profile/ClubSection";
import { GoogleButton } from "@/components/profile/GoogleButton";
import { EmptyPeg, LeagueStickers, Peg, Section, StatStickers } from "@/components/profile/Peg";
import { EmailForm, UsernameForm } from "@/components/profile/ProfileForms";
import { OnYourPhone } from "@/components/pwa/OnYourPhone";
import { APP_ICON_SRC } from "@/lib/og/logo";
import { currentUser } from "@/lib/daily/data";
import { getHub } from "@/lib/league/data";
import { clubChoices, getProfileView } from "@/lib/profile/data";
import { gameDate, seasonLabel, seasonOf } from "@/lib/time";
import { KeepyUppy } from "@/components/loading/KeepyUppy";

export const metadata: Metadata = {
  title: "Your shirt · iKnowBall",
  robots: { index: false, follow: false },
};

const AUTH_ERRORS: Record<string, string> = {
  link: "That link didn't work. It may have expired: send a new one.",
  taken: "That Google account already has an iKnowBall account. Sign out, then sign in with Google.",
  google: "Google sign-in isn't available right now. Use your email instead.",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default function ProfilePage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<Loading />}>
      <ProfileScreen searchParams={searchParams} />
    </Suspense>
  );
}

function Header() {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-navy pt-3.5 pb-2 lg:col-span-2">
      <span className="label">Your shirt</span>
      <span className="label">Season {seasonLabel(seasonOf(gameDate()))}</span>
    </div>
  );
}

// Reads the session, so it renders per request.
async function ProfileScreen({ searchParams }: { searchParams: SearchParams }) {
  await connection();
  const [user, params] = await Promise.all([currentUser(), searchParams]);
  const authError = AUTH_ERRORS[String(params.auth_error ?? "")];

  if (!user) {
    return (
      <main className="mx-auto w-full flex-1 max-w-[560px] px-4 pb-8">
        <Header />
        {authError && <Alert>{authError}</Alert>}
        <span className="label mt-4 block text-royal">Your shirt</span>
        <h1 className="mt-0.5 font-display text-[60px] leading-[0.86] uppercase">
          No shirt <span className="text-royal">yet</span>
        </h1>
        <EmptyPeg />
        <p className="mt-3.5 text-lg">Play today&apos;s Daily and your shirt goes up. No sign-up needed.</p>
        <Link href="/daily" className="btn-navy btn-press mt-3 inline-block px-4 py-2.5 font-display text-[22px] uppercase">
          Play today&apos;s Daily →
        </Link>
        <section className="mt-7 border-t-4 border-double border-navy pt-3">
          <span className="label">Played before?</span>
          <GoogleButton label="Sign in with Google" className="mt-2.5" />
          <div className="mt-2.5">
            <EmailForm mode="signin" />
          </div>
        </section>
      </main>
    );
  }

  const [view, clubs, hub] = await Promise.all([getProfileView(user.id), clubChoices(), getHub()]);
  const leagues = hub.leagues;
  const guest = Boolean(user.is_anonymous);

  return (
    <main className="mx-auto w-full flex-1 max-w-[1200px] px-4 pb-10 lg:grid lg:grid-cols-[420px_minmax(0,1fr)] lg:content-start lg:items-start lg:gap-x-14 lg:px-8">
      <Header />

      <section className="pt-4 lg:col-start-1">
        {authError && <Alert>{authError}</Alert>}
        <span className="label block text-royal">
          {view.club ? `${view.club.name} fan` : view.asked ? "Neutral" : "No club yet"} · {view.tier ?? "Unplaced"}
        </span>
        <h1 className={`mt-0.5 font-display leading-[0.86] [overflow-wrap:anywhere] uppercase ${nameSize(view.username ?? "Guest")}`}>{view.username ?? "Guest"}</h1>
        <Peg view={view} />
        <StatStickers view={view} />
      </section>

      <section className="lg:col-start-2 lg:row-start-2 lg:pt-5">
        <Section title="Your name">
          <UsernameForm current={view.username} />
        </Section>

        <Section title="Your club">
          <ClubSection
            club={view.club}
            asked={view.asked}
            switchedThisSeason={view.switchedThisSeason}
            nextSeason={seasonLabel(seasonOf(gameDate()) + 1)}
            clubs={clubs}
          />
        </Section>

        <Section title="Your leagues">
          <LeagueStickers leagues={leagues} />
        </Section>

        <OnYourPhone guest={guest} icon={APP_ICON_SRC} />

        <Section title={guest ? "Keep your shirt" : "Account"}>
          {guest ? (
            <>
              <p>
                You&apos;re playing as a guest, so your shirt lives on this device only. Save it to keep your Dailies and play
                anywhere.
              </p>
              <GoogleButton label="Save with Google" className="mt-3" />
              <div className="mt-2.5">
                <EmailForm mode="save" />
              </div>
            </>
          ) : (
            <form action={signOut} className="flex items-center justify-between gap-3">
              <span className="min-w-0 truncate">
                Signed in as <b className="font-semibold">{user.email}</b>
              </span>
              <button type="submit" className="shrink-0 font-semibold text-red-card underline underline-offset-[3px]">
                Sign out
              </button>
            </form>
          )}
        </Section>
      </section>
    </main>
  );
}

/** Names run to 20 characters: step the headline down so the longest still fit a phone on one line. */
function nameSize(name: string) {
  return name.length > 16 ? "text-[30px] lg:text-[36px]" : name.length > 11 ? "text-[38px] lg:text-[44px]" : "text-[52px]";
}

function Alert({ children }: { children: React.ReactNode }) {
  return <p className="mt-4 border-l-[6px] border-red-card px-3 py-2.5 font-semibold">{children}</p>;
}

function Loading() {
  return (
    <main className="mx-auto w-full flex-1 max-w-[560px] px-4" aria-busy="true">
      <div className="flex justify-between border-b border-navy pt-3.5 pb-2">
        <span className="label">Your shirt</span>
      </div>
      <KeepyUppy label="Your shirt" caption="Ironing your shirt…" />
    </main>
  );
}
