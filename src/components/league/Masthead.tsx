import Link from "next/link";

export function LeagueMasthead({ right }: { right: string }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-navy pt-3.5 pb-2">
      <Link href="/league" className="label">
        The League
      </Link>
      <span className="label truncate">{right}</span>
    </div>
  );
}

export function LeagueLoading() {
  return (
    <main className="mx-auto min-h-dvh max-w-[560px] px-4 lg:max-w-[1040px]" aria-busy="true">
      <div className="flex justify-between border-b border-navy pt-3.5 pb-2">
        <span className="label">The League</span>
      </div>
      <div className="mt-6 h-[104px] w-3/4 bg-mist" />
    </main>
  );
}
