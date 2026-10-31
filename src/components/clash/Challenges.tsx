import Link from "next/link";
import { startSprint } from "@/app/(site)/clash/actions";
import { SubmitButton } from "@/components/daily/SubmitButton";
import type { Challenge } from "@/lib/clash/challenges";
import { STATS } from "@/lib/clash/rules";

// Beaten challenges come back (Collins, 31 Oct 2026, mocks at
// https://claude.ai/artifact/V7SuwLBLP6oSZwyw7norBW): home's banner when a mate
// beats a challenge you sent, with "Settle it" (a new set on the same stat, for
// them), and the kick-off's list of your challenges.

/** Home's banner for a beaten challenge: a white sticker with a red shadow. */
export function BeatenBanner({ challenge }: { challenge: Challenge }) {
  const { code, stat, rival, mine, played } = challenge;
  if (!rival) return null;
  return (
    <section className="grid -rotate-[0.6deg] gap-2.5 border-[3px] border-navy bg-white p-3 shadow-[4px_4px_0_var(--color-red-card)] lg:grid-cols-[minmax(0,1fr)_auto_280px] lg:items-center lg:gap-6 lg:p-4">
      <div className="min-w-0">
        <span className="label text-[10px] text-red-card lg:text-[11px]">
          Your challenge {code} · {STATS[stat].short}
        </span>
        <h2 className="mt-1 font-display text-[26px] leading-[0.95] uppercase lg:text-[32px]">
          <span className="break-words">{rival.name}</span> <span className="text-red-card">beat</span> your {mine ?? 0}
        </h2>
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-center lg:min-w-48">
        <div className="min-w-0">
          <div className="font-display text-[40px] leading-[0.9] text-red-card tabular-nums">{rival.right}</div>
          <div className="label truncate text-[11px]">{rival.name}</div>
        </div>
        <span className="grid size-8 place-items-center rounded-full bg-navy font-display text-sm text-white">v</span>
        <div>
          <div className="font-display text-[40px] leading-[0.9] tabular-nums">{mine ?? 0}</div>
          <div className="label text-[11px]">You</div>
        </div>
      </div>
      <div className="grid gap-2">
        <form action={startSprint}>
          <input type="hidden" name="rematch" value={code} />
          <SubmitButton pendingText="Picking players…">Settle it</SubmitButton>
        </form>
        <Link href={`/clash/${code}`} className="text-sm font-semibold underline underline-offset-3">
          See the table: {played} played
        </Link>
      </div>
    </section>
  );
}

const STATE = {
  beaten: { label: "Beaten", className: "bg-red-card text-white" },
  top: { label: "On top", className: "bg-teal-light" },
  waiting: { label: "Waiting", className: "border-dashed bg-white" },
} as const;

/** The kick-off's list: each challenge's code, stat, players and where you stand. */
export function ChallengeList({ challenges }: { challenges: Challenge[] }) {
  if (!challenges.length) return null;
  return (
    <section aria-labelledby="your-challenges">
      <h2 id="your-challenges" className="font-display text-2xl leading-none uppercase">
        Your challenges
      </h2>
      <ul className="mt-2 border-2 border-navy">
        {challenges.map((c) => (
          <li key={c.code} className="border-t border-navy first:border-t-0">
            <Link href={`/clash/${c.code}`} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2.5 px-2.5 py-2 hover:bg-mist">
              <span className="bg-navy px-1.5 py-0.5 font-display text-[13px] tracking-[0.08em] text-white">{c.code}</span>
              <span className="min-w-0 text-[13px] leading-tight">
                <b className="block text-sm">
                  {STATS[c.stat].short} · {c.played} played
                </b>
                <span className="block truncate">{detail(c)}</span>
              </span>
              <span className={`border-2 border-navy px-1.5 font-display text-sm whitespace-nowrap uppercase ${STATE[c.state].className}`}>{STATE[c.state].label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function detail(c: Challenge): string {
  if (!c.rival) return "Only you so far. Send it.";
  return c.state === "beaten" ? `${c.rival.name} ${c.rival.right} · you ${c.mine ?? 0}` : `You ${c.mine ?? 0} · ${c.rival.name} ${c.rival.right}`;
}
