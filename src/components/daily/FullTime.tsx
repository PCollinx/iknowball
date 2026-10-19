import Link from "next/link";
import { ClubPicker } from "@/components/profile/ClubPicker";
import type { Club } from "@/lib/profile/club";
import { gameDateClosesAt } from "@/lib/time";
import type { OrderReveal, RecallReveal } from "@/lib/daily/data";
import { Masthead } from "./Masthead";
import { NextDaily } from "./NextDaily";
import { replayToday } from "@/app/daily/actions";
import { RecallGrid } from "./RecallGrid";
import { ShareButtons } from "./ShareButtons";
import { ShareCard } from "./ShareCard";
import { FORMAT_NAME, ordinal } from "./formats";
import { shareCardData, stampText } from "./share";
import { ShirtBack, shirtName, type Kit } from "./ShirtBack";

type Props = {
  issue: number;
  playDate: string;
  recall: RecallReveal | null;
  order: OrderReveal | null;
  points: number;
  topPercent: number | null;
  /** Your place in today's table, and how many are in it. */
  position: number | null;
  players: number;
  siteUrl: string;
  /** The clubs to pick from when "Who do you support?" hasn't been asked yet. */
  clubChoices: Club[] | null;
  /** Your club, when it's in today's fixture: tagged on the share card. */
  fanOf: string | null;
  /** The fixture's kit for the answer shirts. */
  kit: Kit | null;
  /** Your own shirt: your club's kit, or the neutral one. */
  myKit: Kit;
  /** Previews and local runs, where today's Daily can be replayed. */
  testSite?: boolean;
};

function banter(recall: RecallReveal): string {
  const short = recall.missed.length;
  if (short === 0) return "Clean sweep. Unreal ball knowledge.";
  if (short <= 3) return `${stampText(short)} ${shirtName(recall.missed[0])} was right there.`;
  return `${short} missing. ${shirtName(recall.missed[0])} was right there.`;
}

export function FullTime({ issue, playDate, recall, order, points, topPercent, position, players, siteUrl, clubChoices, fanOf, kit, myKit, testSite = false }: Props) {
  const found = recall?.found.length ?? 0;
  const total = recall ? found + recall.missed.length : 0;
  const card = recall ? shareCardData({ issue, playDate, recall, order, points, topPercent, siteUrl, fanOf, kit }) : null;
  const shareText = [
    `iKnowBall · The Daily No. ${String(issue).padStart(3, "0")}`,
    recall?.daily.title ?? "",
    recall ? `${"■".repeat(found)}${"□".repeat(total - found)} ${found}/${total}` : "",
    order ? `${FORMAT_NAME[order.daily.format]} ${order.correct}/${order.slots.length}` : "",
    `Beat me: ${siteUrl.replace(/\/$/, "")}/daily`,
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <main className="mx-auto min-h-dvh max-w-[1200px] px-4 lg:grid lg:grid-cols-[minmax(0,1fr)_480px] lg:gap-x-10 lg:px-8">
      <div className="lg:col-span-2">
        <Masthead issue={issue} right="Full time" />
      </div>

      {/* Phone order: score, share card, details. Desktop: card pinned on the right. */}
      <section className="lg:col-start-1">
        {recall && (
          <>
            <div className="grid grid-cols-[1fr_auto] items-end gap-2 border-b-[3px] border-double border-navy pt-3.5 pb-2.5">
              <div>
                <span className="label">{recall.daily.title}</span>
                <div className="font-display text-[128px] leading-[0.78] text-royal tabular-nums lg:text-[176px]">
                  {found}
                  <small className="text-[44px] text-navy lg:text-[60px]">/{total}</small>
                </div>
              </div>
              <span className="bg-teal px-2 pt-1 pb-1.5 font-display text-lg text-white uppercase">
                {topPercent ? `Top ${topPercent}%` : "Early doors"}
              </span>
            </div>
            <p className="mt-3 border-l-[6px] border-red-card px-3 py-2.5 text-[17px] font-semibold">{banter(recall)}</p>
          </>
        )}
        {clubChoices && (
          <div className="mt-5 border-y-[3px] border-double border-navy py-4">
            <h2 className="font-display text-[44px] leading-[0.9] uppercase">
              Who do you <span className="text-royal">support?</span>
            </h2>
            <p className="mt-2">
              Your club dresses your shirt and puts you in the fanbase table. It never changes your questions or your score.
              You can switch once a season.
            </p>
            <ClubPicker clubs={clubChoices} current={null} mode="prompt" />
          </div>
        )}
        <Link href="/daily/table" className="group mt-4 flex items-center gap-3 border-y-[3px] border-double border-navy py-2.5">
          <span className="min-w-0 flex-1">
            <span className="block font-display text-[32px] leading-[0.9] uppercase">Today&apos;s table</span>
            <span className="block text-sm text-navy/70">
              {position ? `You're ${ordinal(position)} of ${players}. Ties go to less time used.` : "Everyone's day score, best first."}
            </span>
          </span>
          <span aria-hidden="true" className="font-display text-[32px] text-royal transition-transform duration-150 group-hover:translate-x-1">
            →
          </span>
        </Link>
        <Link href="/profile" className="group mt-4 flex items-center gap-3 bg-navy py-2 pr-4 pl-2 text-white">
          <span className="w-14 shrink-0 transition-transform duration-150 group-hover:-translate-y-0.5 group-hover:-rotate-3">
            <ShirtBack kit={myKit} lettering="tag" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-display text-[32px] leading-[0.9] uppercase">Your shirt</span>
            <span className="block text-sm text-white/80">Rating, streak and this week&apos;s score</span>
          </span>
          <span aria-hidden="true" className="font-display text-[32px] text-teal-light">
            →
          </span>
        </Link>
      </section>

      <aside className="mt-4 lg:sticky lg:top-4 lg:col-start-2 lg:row-span-2 lg:row-start-2 lg:mt-0 lg:self-start lg:pt-3.5">
        {card && <ShareCard {...card} />}
        <ShareButtons text={shareText} image={card ? { url: "/daily/card", name: `iknowball-daily-${String(issue).padStart(3, "0")}.png` } : null} />
        <div className="mt-2 flex items-center justify-between border-t-2 border-navy pt-3 pb-4">
          <span className="label">Next Daily in</span>
          <NextDaily closesAt={gameDateClosesAt(playDate).toISOString()} />
        </div>
        {testSite && (
          <form action={replayToday} className="flex items-center justify-between gap-3 border-2 border-dashed border-red-card p-3">
            <span className="text-sm font-semibold text-red-card">Test site only. Live players get one try.</span>
            <button type="submit" className="shrink-0 bg-red-card px-4 py-1.5 font-display text-lg text-white uppercase">
              Play it again
            </button>
          </form>
        )}
      </aside>

      <section className="lg:col-start-1">

        <table className="mt-3.5 w-full border-collapse tabular-nums">
          <thead>
            <tr className="border-b border-navy">
              <th className="label py-2 text-left text-navy/70">Part</th>
              <th className="label py-2 text-right text-navy/70">Score</th>
            </tr>
          </thead>
          <tbody>
            {recall && (
              <tr className="border-b border-track">
                <td className="py-2">{FORMAT_NAME[recall.daily.format]}</td>
                <td className="py-2 text-right font-display text-2xl">
                  {found} / {total}
                </td>
              </tr>
            )}
            {order && (
              <tr className="border-b border-track">
                <td className="py-2">{FORMAT_NAME[order.daily.format]}</td>
                <td className="py-2 text-right font-display text-2xl">
                  {order.correct} / {order.slots.length}
                </td>
              </tr>
            )}
            <tr className="border-b border-track">
              <td className="py-2">Day score</td>
              <td className="py-2 text-right font-display text-2xl">{points} / 100</td>
            </tr>
          </tbody>
        </table>

        {recall && (
          <div className="py-4">
            <span className="label">The squad</span>
            <div className="mt-2">
              <RecallGrid reveal={recall} kit={kit} wide />
            </div>
          </div>
        )}

        {order && (
          <div className="pb-4">
            <span className="label">{FORMAT_NAME[order.daily.format]} · the right answer</span>
            <ol className="mt-1">
              {order.daily.format === "era" ? order.slots.map((s, i) => (
                <li key={i} className="grid grid-cols-[34px_1fr_auto] items-baseline gap-2 border-b border-track py-1.5">
                  <span className="font-display text-2xl">{i + 1}</span>
                  <span>
                    <span className="font-display text-xl uppercase">{s.note}</span>
                    {!s.right && (
                      <span className="block text-[13px] font-semibold text-red-card">You said {s.placed || "nothing"}</span>
                    )}
                  </span>
                  <span className={`font-display text-xl tabular-nums ${s.right ? "text-royal" : "text-red-card"}`}>{s.correct}</span>
                </li>
              )) : order.slots.map((s, i) => (
                <li key={i} className="grid grid-cols-[34px_1fr_auto] items-baseline gap-2 border-b border-track py-1.5">
                  <span className="font-display text-2xl">{i + 1}</span>
                  <span>
                    <span className="font-display text-xl uppercase">{s.correct}</span>
                    {!s.right && (
                      <span className="block text-[13px] font-semibold text-red-card">
                        You put {s.placed ? shirtName(s.placed) : "nobody"} here
                      </span>
                    )}
                  </span>
                  <span className={`font-display text-xl ${s.right ? "text-royal" : "text-red-card"}`}>{s.note ?? (s.right ? "✓" : "×")}</span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </section>

    </main>
  );
}
