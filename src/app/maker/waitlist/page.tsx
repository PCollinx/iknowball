import { Suspense } from "react";
import { connection } from "next/server";
import { Chip, MAKER_MAIN, MakerBar, MakerHead } from "@/components/maker/MakerBar";
import { dayLabel } from "@/lib/drafts/matchday";
import { TestEmail } from "@/components/maker/TestEmail";
import { requireAdmin, waitlistRows } from "@/lib/maker/data";
import { createAdminClient } from "@/lib/supabase/admin";
import { summarise } from "@/lib/maker/waitlist";
import { GATES_OPEN_LABEL } from "@/lib/waitlist";

// The maker's Waitlist page (Collins, 1 Nov 2026): how many have signed the
// team sheet, by day and by club, the leagues named and everyone on it. Admins
// only: it shows emails.

export default function MakerWaitlistPage() {
  return (
    <Suspense fallback={<main className="min-h-dvh" aria-busy="true" />}>
      <MakerWaitlist />
    </Suspense>
  );
}

const WAT = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Lagos", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
/** Days shown on the chart. */
const CHART_DAYS = 21;
/** Clubs listed. */
const TOP_CLUBS = 10;

async function MakerWaitlist() {
  await connection();
  await requireAdmin();
  const [rows, mail] = await Promise.all([waitlistRows(), launchCounts()]);
  const s = summarise(rows);
  const days = s.days.slice(-CHART_DAYS);
  const most = Math.max(1, ...days.map((d) => d.count));
  const leagues = s.entries.filter((e) => e.league_name);
  const panel = "min-w-0 border-2 border-navy bg-mist p-3";

  return (
    <>
      <MakerBar active="waitlist" />
      <main className={MAKER_MAIN}>
        <MakerHead title="Waitlist" tools={<Chip kind="plain">Gates open {GATES_OPEN_LABEL}</Chip>}>
          Everyone on the team sheet. Days are WAT; the number is their place in the queue, the one the waitlist showed them.
        </MakerHead>

        <section className="grid gap-3 sm:grid-cols-3">
          <div className={panel}>
            <p className="label">Names down</p>
            <p className="font-display text-[40px] leading-[0.9] tabular-nums">{s.total}</p>
          </div>
          <div className={panel}>
            <p className="label">Today</p>
            <p className="font-display text-[40px] leading-[0.9] tabular-nums">{s.today}</p>
          </div>
          <div className={panel}>
            <p className="label">Leagues named</p>
            <p className="font-display text-[40px] leading-[0.9] tabular-nums">{s.leagues}</p>
            <p className="mt-1 text-[13px] text-slate">Each starts the first time its email signs in from {GATES_OPEN_LABEL}, or now with the beta invite.</p>
          </div>
        </section>

        <section className="mt-4 grid gap-3 border-2 border-navy p-3 sm:grid-cols-[minmax(0,1fr)_260px] sm:items-start">
          <div className="min-w-0">
            <p className="label">Launch email</p>
            <p className="mt-1 font-display text-[28px] leading-[0.95] uppercase tabular-nums">
              {mail.sent} sent · {Math.max(0, s.total - mail.sent - mail.unsubscribed)} to go
              {mail.unsubscribed > 0 && <span className="text-slate"> · {mail.unsubscribed} unsubscribed</span>}
            </p>
            <p className="mt-1 text-[13px] text-slate">
              Goes out by itself from 07:00 WAT {GATES_OPEN_LABEL}, up to 100 a day on Resend&apos;s free plan; the rest go the next morning.{" "}
              <a href="/maker/waitlist/email" target="_blank" className="font-semibold text-royal underline underline-offset-2">
                See it as yours
              </a>
              .
            </p>
          </div>
          <TestEmail />
        </section>

        <section className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0 border-2 border-navy p-3">
            <h2 className="font-display text-2xl leading-none uppercase">By day</h2>
            {days.length ? (
              <ol className="mt-3 flex h-40 items-end gap-1" aria-label="Sign-ups a day">
                {days.map((d) => (
                  <li key={d.date} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1" title={`${dayLabel(d.date)}: ${d.count}`}>
                    <span className="font-display text-sm leading-none tabular-nums">{d.count || ""}</span>
                    <span className="w-full bg-royal" style={{ height: `${(d.count / most) * 100}%` }} />
                    <span className="text-[10px] whitespace-nowrap text-slate">{dayLabel(d.date).split(" ").slice(1).join(" ")}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-2 text-sm text-slate">Nobody yet.</p>
            )}
          </div>
          <div className="min-w-0 border-2 border-navy p-3">
            <h2 className="font-display text-2xl leading-none uppercase">Clubs</h2>
            <ol className="mt-2 grid gap-1 text-sm">
              {s.clubs.slice(0, TOP_CLUBS).map((c) => (
                <li key={c.club} className="flex justify-between gap-2 border-b border-track pb-1">
                  <span className="truncate font-semibold">{c.club}</span>
                  <span className="font-display tabular-nums">{c.count}</span>
                </li>
              ))}
            </ol>
            {s.clubs.length > TOP_CLUBS && <p className="mt-1 text-[13px] text-slate">And {s.clubs.length - TOP_CLUBS} more.</p>}
          </div>
        </section>

        {leagues.length > 0 && (
          <section className="mt-4 border-2 border-navy p-3">
            <h2 className="font-display text-2xl leading-none uppercase">Leagues named</h2>
            <ul className="mt-2 flex flex-wrap gap-2 text-sm">
              {leagues.map((e) => (
                <li key={e.id} className="border-2 border-navy px-2 py-0.5">
                  <span className="font-semibold">{e.league_name}</span>
                  <span className="text-slate"> · {e.name ?? e.email}</span>
                  {e.league_id && <span className="ml-1.5"><Chip kind="ok">Started</Chip></span>}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="mt-4">
          <h2 className="font-display text-2xl leading-none uppercase">Everyone, newest first</h2>
          <div className="mt-2 overflow-x-auto border-2 border-navy">
            <table className="w-full text-left text-sm">
              <thead className="bg-navy text-white">
                <tr>
                  <th className="px-2 py-1.5 font-semibold">No.</th>
                  <th className="px-2 py-1.5 font-semibold">Name</th>
                  <th className="px-2 py-1.5 font-semibold">Email</th>
                  <th className="px-2 py-1.5 font-semibold">Club</th>
                  <th className="px-2 py-1.5 font-semibold">League</th>
                  <th className="px-2 py-1.5 font-semibold">Signed</th>
                </tr>
              </thead>
              <tbody>
                {s.entries.map((e) => (
                  <tr key={e.id} className="border-t border-track">
                    <td className="px-2 py-1 font-display tabular-nums">{e.no}</td>
                    <td className="px-2 py-1 font-semibold">{e.name ?? "–"}</td>
                    <td className="px-2 py-1">{e.email}</td>
                    <td className="px-2 py-1">{e.favourite_club ?? "Neutral"}</td>
                    <td className="px-2 py-1">{e.league_name ?? "–"}</td>
                    <td className="px-2 py-1 whitespace-nowrap text-slate">{WAT.format(new Date(e.created_at))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!s.entries.length && <p className="p-3 text-sm text-slate">Nobody yet.</p>}
          </div>
        </section>
      </main>
    </>
  );
}

/** How many have had the launch email, and how many unsubscribed. */
async function launchCounts(): Promise<{ sent: number; unsubscribed: number }> {
  const admin = createAdminClient();
  const [sent, unsubscribed] = await Promise.all([
    admin.from("waitlist").select("id", { head: true, count: "exact" }).not("launch_emailed_at", "is", null),
    admin.from("waitlist").select("id", { head: true, count: "exact" }).not("unsubscribed_at", "is", null),
  ]);
  return { sent: sent.count ?? 0, unsubscribed: unsubscribed.count ?? 0 };
}
