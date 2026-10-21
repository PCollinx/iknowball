import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/nav/SiteFooter";
import { SiteNav } from "@/components/nav/SiteNav";

// 404, in the site frame. It sits outside the (site) group (Next serves the
// root not-found for any address that matches nothing), so it draws the
// navbar and footer itself.

export const metadata: Metadata = {
  title: "Offside · iKnowBall",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteNav />
      <main className="mx-auto w-full max-w-[560px] flex-1 px-4 pt-10 pb-6">
        <span className="label text-royal">404 · Flag&apos;s up</span>
        <h1 className="mt-2 font-display text-[72px] leading-[0.85] uppercase lg:text-[96px]">
          Off<span className="text-royal">side</span>
        </h1>
        <p className="mt-4 text-lg">That page doesn&apos;t exist, or it was in an offside position when we looked. Back onside:</p>
        <Link href="/" className="mt-6 block bg-royal sash p-3.5 text-center font-display text-[28px] text-white uppercase">
          Back to matchday
        </Link>
      </main>
      <SiteFooter />
    </div>
  );
}
