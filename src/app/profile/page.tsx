import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { continueWithGoogle, signOut } from "@/app/profile/actions";
import { ShirtBack } from "@/components/daily/ShirtBack";
import { ClubPicker } from "@/components/profile/ClubPicker";
import { EmailForm, UsernameForm } from "@/components/profile/ProfileForms";
import { currentUser } from "@/lib/daily/data";
import { kitOf } from "@/lib/profile/club";
import { clubChoices, getProfileView, type ProfileView } from "@/lib/profile/data";
import { PLACEMENT_DAYS } from "@/lib/profile/stats";
import { gameDate, seasonLabel, seasonOf } from "@/lib/time";

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
      <Link href="/" className="label">
        iKnowBall
      </Link>
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
      <main className="mx-auto min-h-dvh max-w-[560px] px-4 pb-8">
        <Header />
        {authError && <Alert>{authError}</Alert>}
        <h1 className="mt-6 font-display text-[64px] leading-[0.9] uppercase">
          No shirt <span className="text-royal">yet</span>
        </h1>
        <p className="mt-3 text-lg">Play today&apos;s Daily and you get one. No sign-up needed.</p>
        <Link href="/daily" className="mt-5 block bg-royal p-3.5 text-center font-display text-[28px] text-white uppercase">
          Play today&apos;s Daily
        </Link>
        <section className="mt-8 border-t-[3px] border-double border-navy pt-4">
          <span className="label">Played before?</span>
          <GoogleButton label="Sign in with Google" />
          <div className="mt-4">
            <EmailForm mode="signin" />
          </div>
        </section>
      </main>
    );
  }

  const [view, clubs] = await Promise.all([getProfileView(user.id), clubChoices()]);
  const guest = Boolean(user.is_anonymous);

  return (
    <main className="mx-auto min-h-dvh max-w-[1200px] px-4 pb-10 lg:grid lg:grid-cols-[420px_minmax(0,1fr)] lg:gap-x-12 lg:px-8">
      <Header />

      <section className="lg:col-start-1">
        {authError && <Alert>{authError}</Alert>}
        <div className="mx-auto mt-5 w-[72%] max-w-[300px] lg:w-full">
          <ShirtBack kit={kitOf(view.club)} name={view.username ?? "Guest"} num={view.tier ?? "?"} />
        </div>
        <div className="mt-4 flex items-end justify-between gap-3 border-b-[3px] border-double border-navy pb-2.5">
          <div className="min-w-0">
            <span className="label">{view.club ? `${view.club.name} fan` : view.asked ? "Neutral" : "No club yet"}</span>
            <h1 className="truncate font-display text-[48px] leading-[0.9] uppercase">{view.username ?? "Guest"}</h1>
          </div>
          <span className="shrink-0 bg-teal px-2 pt-1 pb-1.5 font-display text-lg text-white uppercase">{view.tier ?? "Unplaced"}</span>
        </div>
        <Stats view={view} />
      </section>

      <section className="lg:col-start-2 lg:row-span-2 lg:row-start-2 lg:pt-5">
        <Block title="Your name">
          <UsernameForm current={view.username} />
        </Block>

        <Block title="Your club">
          <ClubSection view={view} clubs={clubs} />
        </Block>

        <Block title="Leagues">
          {view.leagues.length ? (
            <ul>
              {view.leagues.map((l) => (
                <li key={l.id} className="border-b border-track py-2 font-display text-2xl uppercase">
                  {l.name}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-navy/70">No leagues yet. Mini-leagues with your mates are coming soon.</p>
          )}
        </Block>

        <Block title={guest ? "Keep your shirt" : "Account"}>
          {guest ? (
            <>
              <p>
                You&apos;re playing as a guest, so your shirt lives on this device only. Save it to keep your Dailies and play
                anywhere.
              </p>
              <GoogleButton label="Save with Google" />
              <div className="mt-4">
                <EmailForm mode="save" />
              </div>
            </>
          ) : (
            <form action={signOut} className="flex items-center justify-between gap-3">
              <span className="min-w-0 truncate">Signed in as {user.email}</span>
              <button type="submit" className="shrink-0 font-semibold underline underline-offset-4">
                Sign out
              </button>
            </form>
          )}
        </Block>
      </section>
    </main>
  );
}

function Stats({ view }: { view: ProfileView }) {
  const placed = view.tier !== null;
  const rows = [
    { key: "Rating", value: String(view.rating) },
    placed
      ? { key: "Tier", value: view.tier! }
      : { key: "Placement", value: `${view.daysPlayed} of ${PLACEMENT_DAYS}`, note: `${PLACEMENT_DAYS - view.daysPlayed} more ${PLACEMENT_DAYS - view.daysPlayed === 1 ? "Daily" : "Dailies"} to get placed` },
    { key: "Streak", value: view.streak === 1 ? "1 day" : `${view.streak} days` },
    { key: "This week", value: `${view.weekScore} / 500`, note: `Best 5 days count · ${view.weekDays} played` },
  ];
  return (
    <table className="mt-1 w-full border-collapse tabular-nums">
      <tbody>
        {rows.map((r) => (
          <tr key={r.key} className="border-b border-track">
            <td className="py-2">
              {r.key}
              {r.note && <span className="block text-[13px] text-navy/70">{r.note}</span>}
            </td>
            <td className="py-2 text-right font-display text-2xl uppercase">{r.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ClubSection({ view, clubs }: { view: ProfileView; clubs: Awaited<ReturnType<typeof clubChoices>> }) {
  const nextSeason = seasonLabel(seasonOf(gameDate()) + 1);
  if (view.switchedThisSeason) {
    return (
      <p>
        {view.club ? `${view.club.name}.` : "Neutral."} You&apos;ve used this season&apos;s switch, so you can change club
        again in {nextSeason}.
      </p>
    );
  }
  const first = !view.club;
  return (
    <>
      <p>
        {first
          ? "Pick who you support. It dresses your shirt and puts you in the fanbase table. It never changes your questions or your score."
          : `${view.club!.name}. You can switch club once a season, so choose carefully.`}
      </p>
      <details className="mt-2" open={first && !view.asked}>
        <summary className="cursor-pointer font-semibold text-royal underline underline-offset-4">
          {first ? "Pick a club" : "Switch club"}
        </summary>
        <ClubPicker clubs={clubs} current={view.club} mode="change" />
      </details>
    </>
  );
}

function GoogleButton({ label }: { label: string }) {
  return (
    <form action={continueWithGoogle} className="mt-3">
      <button type="submit" className="w-full border-2 border-navy p-3 font-display text-2xl uppercase">
        {label}
      </button>
    </form>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-6 border-t-2 border-navy pt-3 lg:first:mt-0">
      <h2 className="mb-2 font-display text-[28px] leading-none uppercase">{title}</h2>
      {children}
    </div>
  );
}

function Alert({ children }: { children: React.ReactNode }) {
  return <p className="mt-4 border-l-[6px] border-red-card px-3 py-2.5 font-semibold">{children}</p>;
}

function Loading() {
  return (
    <main className="mx-auto min-h-dvh max-w-[560px] px-4" aria-busy="true">
      <div className="flex justify-between border-b border-navy pt-3.5 pb-2">
        <span className="label">iKnowBall</span>
      </div>
      <div className="mx-auto mt-5 aspect-square w-[72%] max-w-[300px] bg-mist" />
    </main>
  );
}
