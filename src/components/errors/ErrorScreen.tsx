"use client";

import Link from "next/link";
import { useEffect } from "react";
import { SignalLost, VarBox } from "./Var";

type Props = {
  error: Error & { digest?: string };
  retry: () => void;
  /** What didn't load, in a sentence: "The Daily didn't load." */
  line: string;
  /** A second sentence, when there's something to reassure about. */
  safe?: string;
  /** Inside the site frame, "Back to matchday" is a link; on the last-resort
   * screen (no layout left) it's a full page load. */
  hardLink?: boolean;
};

/** An error screen: VAR's technical fault, "Play on". Reports the error to
 * Sentry, and shows the server's reference so a player can quote it. */
export function ErrorScreen({ error, retry, line, safe, hardLink = false }: Props) {
  useEffect(() => {
    // Imported here, not at the top, so Sentry stays out of the first-load bundle.
    import("@sentry/nextjs").then((Sentry) => Sentry.captureException(error));
  }, [error]);

  const back = "btn-white btn-press flex w-full items-center justify-between px-4 py-3 font-display text-[24px] uppercase";
  return (
    <main className="mx-auto grid w-full max-w-[560px] flex-1 content-start px-4 pt-5 pb-8 lg:max-w-[1200px] lg:grid-cols-2 lg:content-center lg:gap-x-14 lg:px-10 lg:pt-10">
      <div className="lg:self-end">
        <span className="label text-red-card">Stoppage · VAR</span>
        <h1 className="mt-1 font-display text-[56px] leading-[0.85] uppercase lg:text-[96px]">
          Something went <span className="text-red-card">off</span>
        </h1>
      </div>
      <div className="mt-[18px] lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:mt-0 lg:self-center">
        <VarBox strip="VAR · Technical fault" stripClass="bg-[#F4C21B]" verdict="Play on" verdictClass="bg-teal">
          <SignalLost />
        </VarBox>
      </div>
      <div>
        <p className="mt-4 text-lg">
          {line} {safe}
        </p>
        <div className="mt-[18px] grid gap-3 lg:max-w-[420px]">
          <button type="button" onClick={() => retry()} className="btn-teal btn-press flex w-full items-center justify-between px-[18px] py-3.5 font-display text-[28px] uppercase">
            <span>Try again</span>
            <span aria-hidden="true">→</span>
          </button>
          {hardLink ? (
            // The root layout is gone, so a client-side link has nothing to render into.
            // eslint-disable-next-line @next/next/no-html-link-for-pages
            <a href="/" className={back}>
              <span>Back to matchday</span>
              <span aria-hidden="true">→</span>
            </a>
          ) : (
            <Link href="/" className={back}>
              <span>Back to matchday</span>
              <span aria-hidden="true">→</span>
            </Link>
          )}
        </div>
        <p className="label mt-3.5 text-slate">We&apos;ve been told{error.digest ? ` · ref ${error.digest.slice(0, 8).toUpperCase()}` : ""}</p>
      </div>
    </main>
  );
}
