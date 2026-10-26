import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { shortDate } from "@/components/daily/Masthead";
import { MakerBar } from "@/components/maker/MakerBar";
import { requireAdmin } from "@/lib/maker/data";
import { allClubs, upcomingClashes } from "@/lib/teaser/data";
import { FORMATS, MAX_SHIRTS, MIN_SHIRTS, parseTeaser, playerNames, teaserQuery, withHeadline, type Teaser } from "@/lib/teaser/layout";
import { gameDate } from "@/lib/time";

type Search = Record<string, string | string[] | undefined>;

export default function TeaserPage({ searchParams }: { searchParams: Promise<Search> }) {
  return (
    <Suspense fallback={<main className="mx-auto min-h-dvh max-w-[1200px] px-4" aria-busy="true" />}>
      <TeaserMaker searchParams={searchParams} />
    </Suspense>
  );
}

const input = "w-full border-2 border-navy bg-white p-2.5";

async function TeaserMaker({ searchParams }: { searchParams: Promise<Search> }) {
  await connection();
  await requireAdmin();
  const params = await searchParams;
  const drawn = Object.keys(params).length > 0;
  const t: Teaser = parseTeaser(drawn ? params : { when: shortDate(gameDate()), dare: "Think you know ball?" });
  const clubs = await allClubs();
  const picked = [t.home, t.away].map((id) => clubs.find((c) => c.id === id)).filter((c) => c !== undefined);
  const full = withHeadline(
    t,
    picked.map((c) => c.name),
  );
  const clashes = drawn ? await upcomingClashes(picked, playerNames(t)) : [];
  const src = `/maker/teaser/image?${teaserQuery(full)}`;

  return (
    <main className="mx-auto min-h-dvh max-w-[1200px] px-4 pb-12 lg:px-8">
      <MakerBar
        right={
          <Link href="/maker" className="label text-navy/60 underline underline-offset-[3px]">
            All days
          </Link>
        }
      />
      <div className="grid gap-2 border-b-[3px] border-double border-navy py-4 lg:grid-cols-[1fr_auto] lg:items-end">
        <h1 className="font-display text-[56px] leading-[0.9] uppercase lg:text-[88px]">
          Teaser <span className="text-royal">quiz</span>
        </h1>
        <p className="max-w-[46ch] text-navy/70">A shirt-back image for X. No app name on it, and never a question from an upcoming Daily.</p>
      </div>

      <div className="grid gap-8 py-6 lg:grid-cols-[400px_minmax(0,1fr)]">
        <form action="/maker/teaser" className="grid content-start gap-4">
          <fieldset className="grid gap-1.5">
            <legend className="label mb-1.5">Question</legend>
            <div className="flex border-2 border-navy">
              {(
                [
                  ["recall", "Name them"],
                  ["order", "Put in order"],
                  ["pick", "Pick one"],
                ] as const
              ).map(([value, text]) => (
                <label key={value} className="flex flex-1 cursor-pointer justify-center px-3 py-2 has-checked:bg-navy has-checked:text-white">
                  <input type="radio" name="kind" value={value} defaultChecked={t.kind === value} className="sr-only" />
                  <span className="label">{text}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="grid grid-cols-2 gap-3">
            {(["home", "away"] as const).map((side, i) => (
              <label key={side} className="grid gap-1.5">
                <span className="label">{i ? "Second club" : "Club"}</span>
                <select name={side} defaultValue={t[side] ?? ""} className={input}>
                  <option value="">None</option>
                  {clubs.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          <p className="-mt-2 text-sm text-navy/60">Two clubs dress the shirts half and half, like the Daily.</p>

          <label className="grid gap-1.5">
            <span className="label">Headline</span>
            <input name="headline" defaultValue={t.headline} placeholder="Blank uses the clubs: Arsenal and Spurs" maxLength={60} className={input} />
          </label>
          <label className="grid gap-1.5">
            <span className="label">Question</span>
            <textarea
              name="question"
              defaultValue={t.question}
              rows={2}
              maxLength={160}
              placeholder="Name every player to play for both in the Premier League era."
              className={input}
            />
          </label>

          <div className="grid grid-cols-[110px_1fr] items-start gap-3">
            <label className="grid gap-1.5">
              <span className="label">Shirts</span>
              <input type="number" name="count" min={MIN_SHIRTS} max={MAX_SHIRTS} defaultValue={t.count} className={`${input} font-display text-2xl`} />
            </label>
            <label className="grid gap-1.5">
              <span className="label">Names</span>
              <textarea
                name="names"
                defaultValue={t.names.join("\n")}
                rows={4}
                placeholder={"One per line, with a club for its kit: Lamine Yamal, BAR\nPut in order or Pick one: the players.\nName them: leave blank, or fill in for the answers."}
                className={input}
              />
            </label>
          </div>

          <div className="grid grid-cols-[110px_1fr] items-start gap-3">
            <label className="grid gap-1.5">
              <span className="label">No.</span>
              <input type="number" name="no" min={1} max={999} defaultValue={t.no} className={`${input} font-display text-2xl`} />
            </label>
            <label className="grid gap-1.5">
              <span className="label">Date line</span>
              <input name="when" defaultValue={t.when} maxLength={24} className={input} />
            </label>
          </div>
          <label className="grid gap-1.5">
            <span className="label">Dare</span>
            <input name="dare" defaultValue={t.dare} maxLength={60} className={input} />
          </label>
          <label className="grid gap-1.5">
            <span className="label">Corner</span>
            <input name="aside" defaultValue={t.aside} maxLength={40} className={input} />
          </label>

          <fieldset className="grid gap-1.5">
            <legend className="label mb-1.5">Size</legend>
            <div className="flex border-2 border-navy">
              {(Object.keys(FORMATS) as (keyof typeof FORMATS)[]).map((f) => (
                <label key={f} className="flex flex-1 cursor-pointer justify-center px-3 py-2 has-checked:bg-navy has-checked:text-white">
                  <input type="radio" name="format" value={f} defaultChecked={t.format === f} className="sr-only" />
                  <span className="label">{FORMATS[f].label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <button type="submit" className="bg-royal px-6 py-2.5 font-display text-2xl text-white uppercase">
            Draw it
          </button>
        </form>

        <div className="grid content-start gap-4">
          {clashes.length > 0 && (
            <div className="border-[3px] border-red-card p-4">
              <p className="font-display text-2xl text-red-card uppercase">Careful: this gives away a Daily</p>
              <ul className="mt-1 grid gap-0.5">
                {clashes.map((c, i) => (
                  <li key={i}>
                    <span className="font-semibold">{shortDate(c.date)}</span>, {c.title}: {c.why}.
                  </li>
                ))}
              </ul>
            </div>
          )}
          {drawn ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element -- a server-drawn PNG, shown as is */}
              <img
                src={src}
                alt="Teaser preview"
                width={FORMATS[t.format].width}
                height={FORMATS[t.format].height}
                className={`h-auto w-full border border-track ${t.format === "tall" ? "max-w-[560px]" : t.format === "square" ? "max-w-[640px]" : ""}`}
              />
              <div className="flex flex-wrap items-center gap-4">
                <a href={`${src}&download=1`} className="bg-navy px-6 py-2.5 font-display text-2xl text-white uppercase">
                  Download PNG
                </a>
                <span className="text-navy/60">
                  {FORMATS[t.format].width} × {FORMATS[t.format].height}
                </span>
              </div>
            </>
          ) : (
            <div className="grid aspect-video place-items-center border-2 border-dashed border-track text-navy/50">Fill it in and draw it.</div>
          )}
        </div>
      </div>
    </main>
  );
}
