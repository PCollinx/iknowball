import Link from "next/link";
import { KeepyUppy } from "@/components/loading/KeepyUppy";

/** `back` turns the left link into "← Your leagues", for a league's own page. `href` is where it goes (the hub). */
export function LeagueMasthead({ right, back = false, href = "/league" }: { right: string; back?: boolean; href?: string }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-navy pt-3.5 pb-2">
      <Link href={href} className="label shrink-0">
        {back ? "← Your leagues" : "The League"}
      </Link>
      <span className="label truncate">{right}</span>
    </div>
  );
}

export function LeagueLoading() {
  return (
    <main className="mx-auto w-full flex-1 max-w-[560px] px-4 lg:max-w-[1040px]" aria-busy="true">
      <div className="flex justify-between border-b border-navy pt-3.5 pb-2">
        <span className="label">The League</span>
      </div>
      <KeepyUppy label="The League" caption="Checking the table…" />
    </main>
  );
}
