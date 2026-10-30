import { Suspense } from "react";
import { connection } from "next/server";
import { ListEditor } from "@/components/maker/ListEditor";
import { MakerBar } from "@/components/maker/MakerBar";
import { getLists, LIST_KEY } from "@/lib/curated/data";
import { LIST_KINDS, listToText, type ListKind } from "@/lib/curated/lists";
import { requireAdmin } from "@/lib/maker/data";

export default function ListsPage() {
  return (
    <Suspense fallback={<main className="mx-auto min-h-dvh max-w-[1000px] px-4" aria-busy="true" />}>
      <Lists />
    </Suspense>
  );
}

/** Which Daily templates each list answers. */
const USES: Record<ListKind, string> = {
  standings: "Title season (Era) from each season's 1st; Where they finished (In Order) from the latest full table.",
  "golden-boots": "Golden Boot winners (Free Recall), Golden Boot picks (Rapid) and Golden Boot season (Era).",
  captains: "Captains (Free Recall, a club with 6 or more since 1992) and Captain's years (Era).",
  results: "Famous result (Era): the season it happened.",
  moments: "How old was he (Era): his age on the day.",
};

async function Lists() {
  await connection();
  await requireAdmin();
  const lists = await getLists();

  return (
    <main className="mx-auto min-h-dvh max-w-[1000px] px-4 pb-12 lg:px-8">
      <MakerBar active="lists" />
      <div className="border-b-[3px] border-double border-navy py-4">
        <h1 className="font-display text-[56px] leading-[0.9] uppercase lg:text-[88px]">
          The <span className="text-royal">lists</span>
        </h1>
        <p className="mt-2 max-w-[640px] text-lg">
          Kept by hand for the templates no feed answers. Clubs go by the app&apos;s names (Man United, Spurs). Saving replaces the whole list; drafts already made keep their answers.
        </p>
      </div>
      <div className="mt-6 grid gap-10">
        {LIST_KINDS.map((kind) => (
          <ListEditor key={kind} kind={kind} text={listToText(kind, lists[LIST_KEY[kind]])} uses={USES[kind]} />
        ))}
      </div>
    </main>
  );
}
