import type { Metadata } from "next";
import Link from "next/link";
import { OffsideScreen, VarBox } from "@/components/errors/Var";
import { SiteFooter } from "@/components/nav/SiteFooter";
import { SiteNav } from "@/components/nav/SiteNav";

// 404, in the site frame. It sits outside the (site) group (Next serves the
// root not-found for any address that matches nothing), so it draws the
// navbar and footer itself. "VAR check" (step 11, option A): your page is
// beyond the last man.

export const metadata: Metadata = {
  title: "Offside · iKnowBall",
  robots: { index: false, follow: false },
};

const LINKS = [
  ["The Daily", "/daily"],
  ["Clash", "/clash"],
  ["The League", "/league"],
] as const;

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteNav />
      <main className="mx-auto grid w-full max-w-[560px] flex-1 content-start px-4 pt-5 pb-8 lg:max-w-[1200px] lg:grid-cols-2 lg:content-center lg:gap-x-14 lg:px-10 lg:pt-10">
        <div className="lg:self-end">
          <span className="label text-royal">404 · VAR check</span>
          <h1 className="mt-1 font-display text-[72px] leading-[0.85] uppercase lg:text-[120px]">
            Off<span className="text-royal">side</span>
          </h1>
        </div>
        <div className="mt-[18px] lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:mt-0 lg:self-center">
          <VarBox strip="VAR · Checking offside" stripClass="bg-teal-light" verdict="Offside" verdictClass="bg-red-card">
            <OffsideScreen />
          </VarBox>
        </div>
        <div>
          <p className="mt-4 text-lg">That page doesn&apos;t exist, or it was beyond the last man when we looked. The flag&apos;s up.</p>
          <Link href="/" className="btn-teal btn-press mt-[18px] flex w-full items-center justify-between px-[18px] py-3.5 font-display text-[28px] uppercase lg:max-w-[420px]">
            <span>Back to matchday</span>
            <span aria-hidden="true">→</span>
          </Link>
          <p className="mt-3.5 text-[15px]">
            Or straight to{" "}
            {LINKS.map(([name, href], i) => (
              <span key={href}>
                {i > 0 && " · "}
                <Link href={href} className="font-semibold text-royal underline underline-offset-[3px]">
                  {name}
                </Link>
              </span>
            ))}
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
