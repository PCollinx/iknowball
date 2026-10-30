import type { Metadata } from "next";
import { SignalLost, VarBox } from "@/components/errors/Var";
import { Brand } from "@/components/nav/SiteNav";
import { BackOnline } from "./BackOnline";

// The offline screen (step 16, option A "VAR: no signal", Collins, 30 Oct
// 2026): the service worker (src/app/sw.js) keeps a copy and shows it when a
// page can't load, with ?from= the page you were after. It sits outside the
// (site) frame, as the navbar's rating and links need the network. It is
// static, so the copy needs nothing from the server.

export const metadata: Metadata = {
  title: "Lost the signal · iKnowBall",
  robots: { index: false, follow: false },
};

export default function Offline() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b-[4px] border-double border-navy">
        <div className="mx-auto flex max-w-[1184px] items-center justify-between gap-4 px-4 py-3">
          <span className="flex items-center gap-2 lg:gap-2.5">
            <Brand />
          </span>
          <span className="label bg-red-card px-2 py-1 text-white">Offline</span>
        </div>
      </header>
      <main className="mx-auto grid w-full max-w-[560px] flex-1 content-start px-4 pt-5 pb-8 lg:max-w-[1200px] lg:grid-cols-2 lg:content-center lg:gap-x-14 lg:px-10 lg:pt-10">
        <div className="lg:self-end">
          <span className="label text-red-card">Stoppage · No signal</span>
          <h1 className="mt-1 font-display text-[60px] leading-[0.85] uppercase lg:text-[110px]">
            Lost the <span className="text-red-card">signal</span>
          </h1>
        </div>
        <div className="mt-[18px] lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:mt-0 lg:self-center">
          <VarBox strip="VAR · Connection lost" stripClass="bg-[#F4C21B]" status="○ Off air" verdict="Waiting" verdictClass="bg-slate">
            <SignalLost label="No signal" />
          </VarBox>
        </div>
        <div>
          <p className="mt-4 text-lg">
            You&apos;re offline. The Daily, Clash and your leagues need the internet: every answer is checked on our side. Mid-round?
            The clock&apos;s ours and it&apos;s still running, so get back on quick.
          </p>
          <BackOnline />
        </div>
      </main>
    </div>
  );
}
