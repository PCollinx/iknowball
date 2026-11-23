import { Suspense } from "react";
import { connection } from "next/server";
import { shortDate } from "@/components/daily/Masthead";
import { Chip, MAKER_MAIN, MakerBar, MakerHead } from "@/components/maker/MakerBar";
import { PostRow } from "@/components/maker/PostRow";
import { requireAdmin } from "@/lib/maker/data";
import { postsFor } from "@/lib/posts/data";
import { gameHour, postState } from "@/lib/posts/plan";
import { gameDate } from "@/lib/time";

// The maker's Posts tab (Collins, 23 Nov 2026, option A of
// https://claude.ai/artifact/81Un4JKJRd1BJp4yuKevAC): today's X posts in the
// order they go out, made ready from the database, sent by hand from Collins's
// own X app. No X API, nothing to pay. The whistle buzzes his phone when
// they're ready (src/lib/posts/buzz.ts).

export default function MakerPostsPage() {
  return (
    <Suspense fallback={<main className="min-h-dvh" aria-busy="true" />}>
      <MakerPosts />
    </Suspense>
  );
}

const WAT = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Lagos", hour: "2-digit", minute: "2-digit" });

async function MakerPosts() {
  await connection();
  await requireAdmin();
  const today = gameDate();
  const hour = gameHour();
  const posts = (await postsFor(today)).map((p) => ({ ...p, state: postState(p.kind, { status: p.status, hour, hasWords: p.words !== null }) }));
  const toGo = posts.filter((p) => p.state === "ready").length;
  const posted = posts.filter((p) => p.state === "posted").length;

  return (
    <>
      <MakerBar active="posts" />
      <main className={MAKER_MAIN}>
        <MakerHead
          title={`Today · ${shortDate(today)}`}
          crumb="Posts"
          tools={
            <>
              <Chip kind={toGo ? "ok" : "plain"}>{toGo} to post</Chip>
              <Chip kind="plain">{posted} posted</Chip>
            </>
          }
        >
          Today&apos;s X posts, words and card made ready. Post on X opens your phone&apos;s share sheet (pick X); on a laptop it opens X with the words in and downloads the card. Nothing goes out until you tap Post in X.
        </MakerHead>
        <div className="max-w-[900px]">
          {posts.map((p) => (
            <PostRow
              key={p.kind}
              date={today}
              kind={p.kind}
              state={p.state}
              words={p.words}
              edited={p.edited}
              hasCard={p.hasCard}
              doneAt={p.at && p.status ? WAT.format(new Date(p.at)) : null}
            />
          ))}
        </div>
      </main>
    </>
  );
}
