import { Suspense } from "react";
import { connection } from "next/server";
import { ListBook } from "@/components/maker/ListEditor";
import { MAKER_MAIN, MakerBar, MakerHead } from "@/components/maker/MakerBar";
import { getLists, LIST_KEY } from "@/lib/curated/data";
import { LIST_KINDS, listToText, type ListKind } from "@/lib/curated/lists";
import { requireAdmin } from "@/lib/maker/data";

export default function ListsPage() {
  return (
    <Suspense fallback={<main className="min-h-dvh" aria-busy="true" />}>
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
    <>
      <MakerBar active="lists" />
      <main className={MAKER_MAIN}>
        <MakerHead title="Lists">
          Kept by hand for the templates no feed answers. Clubs go by the app&apos;s names (Man United, Spurs). Saving replaces the whole list; drafts already made keep their answers.
        </MakerHead>
        <ListBook
          lists={LIST_KINDS.map((kind) => ({ kind, text: listToText(kind, lists[LIST_KEY[kind]]), rows: lists[LIST_KEY[kind]].length, uses: USES[kind] }))}
        />
      </main>
    </>
  );
}
