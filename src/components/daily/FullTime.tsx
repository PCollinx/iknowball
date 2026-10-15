import { gameDateClosesAt } from "@/lib/time";
import type { OrderReveal, RecallReveal } from "@/lib/daily/data";
import { Masthead } from "./Masthead";
import { NextDaily } from "./NextDaily";
import { RecallGrid } from "./RecallGrid";
import { ShareButtons } from "./ShareButtons";
import { ShareCard, stampText } from "./ShareCard";
import { shirtName } from "./ShirtBack";
import { clock } from "./clock";

type Props = {
  issue: number;
  playDate: string;
  recall: RecallReveal | null;
  order: OrderReveal | null;
  points: number;
  topPercent: number | null;
  siteUrl: string;
};

function banter(recall: RecallReveal): string {
  const short = recall.missed.length;
  if (short === 0) return "Clean sweep. Unreal ball knowledge.";
  if (short <= 3) return `${stampText(short)} ${shirtName(recall.missed[0])} was right there.`;
  return `${short} missing. ${shirtName(recall.missed[0])} was right there.`;
}

export function FullTime({ issue, playDate, recall, order, points, topPercent, siteUrl }: Props) {
  const found = recall?.found.length ?? 0;
  const total = recall ? found + recall.missed.length : 0;
  const host = new URL(siteUrl).host;
  const longDate = new Date(`${playDate}T12:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
  const stats = [
    ...(order ? [{ value: `${order.correct}/${order.slots.length}`, key: "In Order" }] : []),
    { value: String(points), key: "Points" },
    { value: topPercent ? `Top ${topPercent}%` : "Early", key: "Today" },
    { value: recall ? clock(recall.timeUsedSeconds) : "-", key: "Time used" },
  ];
  const shareText = [
    `iKnowBall · The Daily No. ${String(issue).padStart(3, "0")}`,
    recall?.daily.title ?? "",
    recall ? `${"■".repeat(found)}${"□".repeat(total - found)} ${found}/${total}` : "",
    order ? `In Order ${order.correct}/${order.slots.length}` : "",
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
      </section>

      <aside className="mt-4 lg:sticky lg:top-4 lg:col-start-2 lg:row-span-2 lg:row-start-2 lg:mt-0 lg:self-start lg:pt-3.5">
        {recall && (
          <ShareCard
            issue={issue}
            dateLabel={longDate}
            title={recall.daily.title}
            prompt={recall.daily.prompt}
            found={found}
            total={total}
            timeUsed={clock(recall.timeUsedSeconds)}
            stats={stats}
            host={host}
          />
        )}
        <ShareButtons text={shareText} />
        <div className="mt-2 flex items-center justify-between border-t-2 border-navy pt-3 pb-4">
          <span className="label">Next Daily in</span>
          <NextDaily closesAt={gameDateClosesAt(playDate).toISOString()} />
        </div>
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
                <td className="py-2">Free Recall</td>
                <td className="py-2 text-right font-display text-2xl">
                  {found} / {total}
                </td>
              </tr>
            )}
            {order && (
              <tr className="border-b border-track">
                <td className="py-2">In Order</td>
                <td className="py-2 text-right font-display text-2xl">
                  {order.correct} / {order.slots.length}
                </td>
              </tr>
            )}
            <tr className="border-b border-track">
              <td className="py-2">Points</td>
              <td className="py-2 text-right font-display text-2xl">{points}</td>
            </tr>
          </tbody>
        </table>

        {recall && (
          <div className="py-4">
            <span className="label">The squad</span>
            <div className="mt-2">
              <RecallGrid reveal={recall} wide />
            </div>
          </div>
        )}

        {order && (
          <div className="pb-4">
            <span className="label">In Order · the right answer</span>
            <ol className="mt-1">
              {order.slots.map((s, i) => (
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
