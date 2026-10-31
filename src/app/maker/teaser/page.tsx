import { Suspense } from "react";
import { connection } from "next/server";
import { shortDate } from "@/components/daily/Masthead";
import { MAKER_MAIN, MakerBar, MakerHead } from "@/components/maker/MakerBar";
import { requireAdmin } from "@/lib/maker/data";
import { allClubs, upcomingClashes } from "@/lib/teaser/data";
import { FORMATS, MAX_SHIRTS, MIN_SHIRTS, parseTeaser, playerNames, teaserQuery, withHeadline, type Teaser } from "@/lib/teaser/layout";
import { gameDate } from "@/lib/time";

type Search = Record<string, string | string[] | undefined>;

export default function TeaserPage({ searchParams }: { searchParams: Promise<Search> }) {
  return (
    <Suspense fallback={<main className="min-h-dvh" aria-busy="true" />}>
      <TeaserMaker searchParams={searchParams} />
    </Suspense>
  );
}

const input = "w-full border-2 border-navy bg-white px-2 py-1.5 text-sm";

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
    <>
      <MakerBar active="teaser" />
      <main className={MAKER_MAIN}>
        <MakerHead title="Teasers">A shirt-back image for X. Never a question from an upcoming Daily.</MakerHead>

        <div className="grid gap-6 lg:grid-cols-[400px_minmax(0,1fr)]">
          <form action="/maker/teaser" className="grid content-start gap-3">
            <fieldset className="grid gap-1.5">
              <legend className="label mb-1 text-[10px]">Question</legend>
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
                    <span className="label text-[10px]">{text}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="grid grid-cols-2 gap-3">
              {(["home", "away"] as const).map((side, i) => (
                <label key={side} className="grid gap-1.5">
                  <span className="label text-[10px]">{i ? "Second club" : "Club"}</span>
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
            <p className="-mt-1.5 text-xs text-slate">Two clubs dress the shirts half and half, like the Daily.</p>

            <label className="grid gap-1.5">
              <span className="label text-[10px]">Headline</span>
              <input name="headline" defaultValue={t.headline} placeholder="Blank uses the fixture: Arsenal v Spurs" maxLength={60} className={input} />
            </label>
            <label className="grid gap-1.5">
              <span className="label text-[10px]">Question</span>
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
                <span className="label text-[10px]">Shirts</span>
                <input type="number" name="count" min={MIN_SHIRTS} max={MAX_SHIRTS} defaultValue={t.count} className={`${input} font-display text-xl`} />
              </label>
              <label className="grid gap-1.5">
                <span className="label text-[10px]">Names</span>
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
                <span className="label text-[10px]">No.</span>
                <input type="number" name="no" min={1} max={999} defaultValue={t.no} className={`${input} font-display text-xl`} />
              </label>
              <label className="grid gap-1.5">
                <span className="label text-[10px]">Date line</span>
                <input name="when" defaultValue={t.when} maxLength={24} className={input} />
              </label>
            </div>
            <label className="grid gap-1.5">
              <span className="label text-[10px]">Dare</span>
              <input name="dare" defaultValue={t.dare} maxLength={60} className={input} />
            </label>
            <label className="grid gap-1.5">
              <span className="label text-[10px]">Corner</span>
              <input name="aside" defaultValue={t.aside} maxLength={40} className={input} />
            </label>

            <fieldset className="grid gap-1.5">
              <legend className="label mb-1 text-[10px]">Size</legend>
              <div className="flex border-2 border-navy">
                {(Object.keys(FORMATS) as (keyof typeof FORMATS)[]).map((f) => (
                  <label key={f} className="flex flex-1 cursor-pointer justify-center px-3 py-2 has-checked:bg-navy has-checked:text-white">
                    <input type="radio" name="format" value={f} defaultChecked={t.format === f} className="sr-only" />
                    <span className="label text-[10px]">{FORMATS[f].label}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            {clashes.length > 0 && (
              <div className="border-2 border-red-card bg-[#fdeef0] px-3 py-2 text-sm text-red-card">
                <p className="font-display text-lg uppercase">Careful: this gives away a Daily</p>
                <ul className="mt-0.5 grid gap-0.5">
                  {clashes.map((c, i) => (
                    <li key={i}>
                      <span className="font-semibold">{shortDate(c.date)}</span>, {c.title}: {c.why}.
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <button type="submit" className="btn-teal btn-press flex items-center justify-between px-4 py-2 font-display text-2xl uppercase">
              <span>Draw it</span>
              <span aria-hidden="true">→</span>
            </button>
          </form>

          <div className="grid content-start gap-3">
            <span className="label">Preview</span>
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
                  <a href={`${src}&download=1`} className="btn-white btn-press flex items-center gap-4 px-4 py-1.5 font-display text-xl uppercase">
                    <span>Download PNG</span>
                    <span aria-hidden="true">→</span>
                  </a>
                  <span className="text-sm text-slate">
                    {FORMATS[t.format].width} × {FORMATS[t.format].height}
                  </span>
                </div>
              </>
            ) : (
              <div className="grid aspect-video place-items-center border-2 border-dashed border-track text-slate">Fill it in and draw it.</div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
