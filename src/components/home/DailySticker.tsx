import Link from "next/link";
import { clock } from "@/components/daily/clock";
import { fanName, headlineFixture, splitFixture } from "@/components/daily/fixture";
import { FORMAT_NAME } from "@/components/daily/formats";
import { ShirtBack, type Kit } from "@/components/daily/ShirtBack";
import type { HomeDaily } from "@/lib/daily/data";
import { ClosesIn } from "./ClosesIn";
import { Sticker, StickerHead, StickerSlot } from "./Sticker";

// The Daily on the home page: a sticker in its album slot (picked 20 Oct
// 2026), the fixture's two shirts floating over the number of answers.

type Props = {
  daily: HomeDaily | null;
  kits: [Kit | undefined, Kit | undefined];
  closesAt: string;
  serverNow: number;
};

const CTA = { fresh: "Play today's Daily", playing: "Carry on", done: "See full time" } as const;

export function DailySticker({ daily, kits, closesAt, serverNow }: Props) {
  const first = daily?.parts.find((p) => p.part === 1) ?? daily?.parts[0];
  const second = daily?.parts.find((p) => p.part === 2);
  const [home, away] = first ? splitFixture(first.title) : ["", null];
  const seconds = daily?.parts.reduce((sum, p) => sum + p.time_limit_seconds, 0) ?? 0;

  return (
    <StickerSlot
      caption={daily ? `No. 01 · The Daily · Issue ${daily.issue}` : "No. 01 · The Daily"}
      aside={
        daily?.status === "done" ? (
          <Link href="/daily/table" className="text-royal underline-offset-2 hover:underline">
            Today&apos;s table ↗
          </Link>
        ) : (
          <span className="text-royal">One try</span>
        )
      }
    >
      <Sticker href="/daily" className="-rotate-1 motion-safe:animate-deal-sticker">
        <StickerHead n="01" name="Daily">
          <span className="label bg-navy px-2 py-1 text-[10px] text-white lg:px-2.5 lg:py-1.5 lg:text-xs">
            {daily?.status === "done" ? "Next in" : "Closes"} <ClosesIn closesAt={closesAt} serverNow={serverNow} />
          </span>
        </StickerHead>

        {/* The shirts are capped by the panel's height, not its width: the band overlaps the panel's foot, so a
            shirt sized from the width alone slid under it on mid-size screens. */}
        <div className="relative mx-2.5 mt-1.5 h-[180px] overflow-hidden border-[1.5px] border-navy bg-mist sm:h-[230px] lg:mx-3 lg:mt-2 lg:h-[270px]">
          <span
            aria-hidden="true"
            className="absolute -bottom-[34px] left-1/2 -translate-x-1/2 font-display text-[160px] leading-none text-track sm:-bottom-[44px] sm:text-[210px] lg:-bottom-[54px] lg:text-[280px]"
          >
            {first?.answer_count ?? "?"}
          </span>
          <div className="absolute top-5 left-[4%] w-[40%] max-w-[124px] motion-safe:animate-float-a sm:top-6 sm:left-[12%] sm:max-w-[168px] lg:top-7 lg:max-w-[200px]">
            <ShirtBack kit={kits[0]} num="?" name={home ? fanName(home) : ""} />
          </div>
          <div className="absolute top-4 right-[4%] w-[40%] max-w-[124px] motion-safe:animate-float-b sm:top-5 sm:right-[12%] sm:max-w-[168px] lg:top-6 lg:max-w-[200px]">
            <ShirtBack kit={kits[1]} num="?" name={away ? fanName(away) : ""} />
          </div>
        </div>

        <div className="relative -mt-3.5 border-y-2 border-navy bg-royal sash px-3 py-2 text-white lg:-mt-4 lg:px-4 lg:py-2.5">
          <h2 className="font-display text-[30px] leading-[0.9] uppercase lg:text-[44px]">
            {first ? headlineFixture(first.title) : "No Daily today"}
          </h2>
          <p className="mt-0.5 line-clamp-2 text-[13px] lg:text-[15px]">{first ? first.prompt : "Back tomorrow with a new one."}</p>
        </div>

        {daily && (
          <dl className="grid grid-cols-3 px-1.5 py-2 text-center lg:py-3">
            <Stat value={daily.status === "done" ? `${daily.points}` : `${first?.answer_count ?? 0}`} label={daily.status === "done" ? "Of 100" : first ? FORMAT_NAME[first.format] : ""} />
            <Stat value={`${second?.answer_count ?? "–"}`} label={second ? FORMAT_NAME[second.format] : "Part 2"} className="border-x-[1.5px] border-track" />
            <Stat value={clock(seconds)} label="Clock" />
          </dl>
        )}

        <span className="block px-2.5 pt-1 pb-4 lg:px-3 lg:pb-5">
          <span className="btn-navy block p-2 text-center font-display text-[22px] uppercase lg:p-2.5 lg:text-[28px]">
            {daily ? CTA[daily.status] : "See you tomorrow"} →
          </span>
        </span>
      </Sticker>
    </StickerSlot>
  );
}

function Stat({ value, label, className = "" }: { value: string; label: string; className?: string }) {
  return (
    <div className={`flex flex-col-reverse ${className}`}>
      <dt className="label text-[10px] lg:text-[11px]">{label}</dt>
      <dd className="font-display text-[26px] leading-none tabular-nums lg:text-[36px]">{value}</dd>
    </div>
  );
}
