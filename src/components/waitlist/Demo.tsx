"use client";

import { useRef, useState } from "react";
import { ArrowUpRight, Play } from "@/components/icons/Icon";

// The demo under the team sheet (step 19, option A "The screen" of
// https://claude.ai/artifact/L1f9AX5XwQseXvASBT27iw): a navy screen with a
// light-teal strip and a play button; the video plays on the page, so the sign-up
// form stays a scroll away. Nothing loads until it's tapped.

export function Demo({ src, poster, xUrl, xLabel }: { src: string; poster: string; xUrl: string; xLabel: string }) {
  const video = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  return (
    <section aria-labelledby="demo-heading" className="mt-[26px] lg:mt-9">
      <div className="flex items-baseline justify-between gap-3 border-b-[4px] border-double border-navy pb-1.5">
        <h2 id="demo-heading" className="font-display text-[30px] leading-[0.9] uppercase lg:text-[36px]">
          See it before kick-off
        </h2>
        <span className="label text-[11px]">0:45</span>
      </div>
      <div className="mt-2.5 border-[2.5px] border-navy bg-navy shadow-[5px_5px_0_var(--color-teal-light)] lg:shadow-[6px_6px_0_var(--color-teal-light)]">
        <div className="label flex justify-between bg-teal-light px-2.5 py-1.5 text-[10px] text-navy">
          <span>Highlights · All three games</span>
          <span>Sound on</span>
        </div>
        <div className="relative aspect-square">
          <video
            ref={video}
            src={src}
            poster={poster}
            preload="none"
            playsInline
            controls={playing}
            onPlay={() => setPlaying(true)}
            className="absolute inset-0 size-full bg-navy object-cover"
          />
          {!playing && (
            <button
              type="button"
              aria-label="Play the demo"
              onClick={() => {
                setPlaying(true);
                void video.current?.play();
              }}
              className="absolute inset-0 m-auto flex size-[76px] items-center justify-center rounded-full border-[2.5px] border-white bg-teal-light text-[28px] text-navy transition-transform hover:scale-105 active:scale-95"
            >
              <Play className="translate-x-[0.06em]" />
            </button>
          )}
        </div>
      </div>
      <p className="mt-3.5 text-[15px] leading-snug">The Daily, Clash and the League in 45 seconds. Plays here, no sign-up.</p>
      <a href={xUrl} target="_blank" rel="noopener" className="mt-1.5 inline-flex items-center gap-1 text-sm font-semibold underline underline-offset-[3px]">
        {xLabel}
        <ArrowUpRight />
      </a>
    </section>
  );
}
