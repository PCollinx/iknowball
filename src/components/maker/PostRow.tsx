"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { markPost, saveWords } from "@/app/maker/posts/actions";
import { Arrow } from "@/components/icons/Icon";
import { saveCard } from "@/components/share/CardSheet";
import { intentUrl, POSTS, postTime, X_LIMIT, xLength, type PostKind, type PostState } from "@/lib/posts/plan";
import { isPhone } from "@/lib/pwa/platform";

// One post on the maker's Posts tab (option A): the time, what it is and how
// it stands, its card, the words, and the buttons. Post on X sends the card
// and words to the phone's share sheet (pick X); on a laptop it opens X's
// compose box with the words in and downloads the card to drag in, since X's
// compose link can't carry a picture. Nothing goes out until Post in X.

export type PostRowProps = {
  date: string;
  kind: PostKind;
  state: PostState;
  words: string | null;
  edited: boolean;
  hasCard: boolean;
  /** "09:04", when it was marked posted or skipped. */
  doneAt: string | null;
};

const CHIP: Record<PostState, string> = {
  ready: "bg-teal-light text-navy",
  posted: "bg-navy text-teal-light",
  skipped: "bg-mist text-slate line-through",
  later: "bg-mist text-slate",
  empty: "border-2 border-dashed border-red-card text-red-card",
};

const btn = "btn-press flex items-center justify-between gap-3.5 px-2.5 pt-2 pb-1.5 font-display text-[17px] leading-none uppercase";
const link = "text-[13px] font-semibold text-slate underline underline-offset-[3px] disabled:opacity-50";

export function PostRow({ date, kind, state, words, edited, hasCard, doneAt }: PostRowProps) {
  const [note, setNote] = useState("");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(words ?? "");
  const [pending, start] = useTransition();
  const file = useRef<Promise<File | null> | null>(null);
  const cardUrl = `/maker/posts/card/${kind}?date=${date}`;
  const live = state === "ready" || state === "posted";

  // Drawn ahead of the tap: phones only open the share sheet straight from one.
  useEffect(() => {
    if (!hasCard || !live) return;
    file.current = fetch(cardUrl)
      .then((r) => (r.ok ? r.blob() : null))
      .then((b) => (b ? new File([b], `iknowball-${kind}-${date}.png`, { type: "image/png" }) : null))
      .catch(() => null);
  }, [cardUrl, hasCard, live, kind, date]);

  async function copyWords(say = true) {
    if (!words) return;
    try {
      await navigator.clipboard.writeText(words);
      if (say) setNote("Words copied.");
    } catch {
      if (say) setNote("Couldn't copy on this browser.");
    }
  }

  async function postOnX() {
    if (!words) return;
    if (!isPhone(navigator.userAgent, navigator.maxTouchPoints)) {
      // Opened straight from the tap, or the browser blocks the new tab.
      window.open(intentUrl(words), "_blank", "noopener");
      const f = await file.current;
      if (f) saveCard(f);
      return setNote(f ? "X is open with the words in. The card's downloaded: drag it in, then Post." : "X is open with the words in.");
    }
    // Copied too: some versions of X keep only the picture from a share.
    void copyWords(false);
    const f = await file.current;
    const share = f && navigator.canShare?.({ files: [f], text: words }) ? { files: [f], text: words } : { text: words };
    try {
      await navigator.share(share);
      setNote("Sent to the share sheet. If X dropped the words, they're copied: paste them in.");
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        window.open(intentUrl(words), "_blank", "noopener");
        setNote("Opened X instead.");
      }
    }
  }

  async function savePicture() {
    const f = await file.current;
    if (f) saveCard(f);
    else setNote("Couldn't draw the card. Try again.");
  }

  const act = (fn: () => Promise<void>) => start(async () => {
    try {
      await fn();
    } catch {
      setNote("Couldn't save that. Try again.");
    }
  });

  const label = {
    ready: "Ready",
    posted: doneAt ? `Posted ${doneAt}` : "Posted",
    skipped: "Skipped",
    later: `From ${postTime(kind)}`,
    empty: "Nothing to post",
  }[state];
  const count = words ? xLength(editing ? draft : words) : 0;

  return (
    <article className="grid gap-3.5 border-t-2 border-navy py-3.5 first:border-t-0 sm:grid-cols-[210px_minmax(0,1fr)]">
      <div className="grid content-start gap-2">
        <span className="font-display text-[26px] leading-[0.9]">{postTime(kind)}</span>
        <span className="font-display text-base leading-none text-slate uppercase">{POSTS[kind].label}</span>
        <span className={`w-fit px-1.5 pt-1 pb-0.5 font-display text-sm leading-none uppercase ${CHIP[state]}`}>{label}</span>
        {hasCard && live && (
          // eslint-disable-next-line @next/next/no-img-element -- a server-drawn PNG, shown as is
          <img src={cardUrl} alt={`${POSTS[kind].label} card`} width={1080} height={1080} loading="lazy" className="aspect-square w-full max-w-[280px] border-2 border-navy" />
        )}
      </div>

      <div className="min-w-0">
        {!words ? (
          <p className="text-sm text-slate">{state === "later" ? `The words fill in at ${postTime(kind)}.` : emptyLine(kind)}</p>
        ) : editing ? (
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={8}
            className="w-full border-2 border-navy p-2.5 text-[14.5px] leading-snug"
            aria-label="The post's words"
          />
        ) : (
          <p className={`border-l-4 border-royal py-0.5 pl-2.5 text-[14.5px] leading-snug whitespace-pre-line ${state === "later" ? "text-slate" : ""}`}>{words}</p>
        )}
        {words && (
          <p className={`mt-1 text-xs ${count > X_LIMIT ? "font-semibold text-red-card" : "text-slate"}`}>
            {count} / {X_LIMIT}
            {edited && !editing && " · edited by hand"}
            {state === "later" && " · numbers so far, the buttons wake up then"}
          </p>
        )}

        {editing ? (
          <div className="mt-2.5 flex flex-wrap items-center gap-3">
            <button type="button" disabled={pending} onClick={() => act(async () => { await saveWords(date, kind, draft); setEditing(false); })} className={`btn-teal ${btn}`}>
              Save words
            </button>
            <button type="button" onClick={() => { setEditing(false); setDraft(words ?? ""); }} className={link}>
              Cancel
            </button>
            {edited && (
              <button type="button" disabled={pending} onClick={() => act(async () => { await saveWords(date, kind, null); setEditing(false); })} className={link}>
                Back to the drafted words
              </button>
            )}
          </div>
        ) : (
          live &&
          words && (
            <>
              <div className="mt-2.5 flex flex-wrap items-center gap-2.5">
                <button type="button" onClick={postOnX} className={`${state === "posted" ? "btn-white" : "btn-teal min-w-[170px]"} ${btn}`}>
                  <span>{state === "posted" ? "Post again" : "Post on X"}</span>
                  <Arrow />
                </button>
                {state === "ready" && (
                  <>
                    <button type="button" onClick={() => copyWords()} className={`btn-white ${btn}`}>
                      Copy words
                    </button>
                    {hasCard && (
                      <button type="button" onClick={savePicture} className={`btn-white ${btn}`}>
                        Save card
                      </button>
                    )}
                  </>
                )}
              </div>
              <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5">
                {state === "ready" ? (
                  <>
                    <button type="button" disabled={pending} onClick={() => act(() => markPost(date, kind, "posted"))} className={link}>
                      Mark posted
                    </button>
                    <button type="button" onClick={() => { setDraft(words); setEditing(true); }} className={link}>
                      Edit the words
                    </button>
                    <button type="button" disabled={pending} onClick={() => act(() => markPost(date, kind, "skipped"))} className={link}>
                      Skip today
                    </button>
                  </>
                ) : (
                  <button type="button" disabled={pending} onClick={() => act(() => markPost(date, kind, null))} className={link}>
                    Not posted after all
                  </button>
                )}
              </div>
            </>
          )
        )}
        {state === "skipped" && (
          <button type="button" disabled={pending} onClick={() => act(() => markPost(date, kind, null))} className={`mt-2.5 ${link}`}>
            Post it after all
          </button>
        )}
        <p role="status" className="mt-1.5 min-h-[20px] text-[13px] font-semibold text-royal">
          {note}
        </p>
      </div>
    </article>
  );
}

function emptyLine(kind: PostKind): string {
  if (kind === "team") return "No team last week: nobody played, or the season's first week is this one.";
  if (kind === "clash") return "No finished sprint this week yet.";
  if (kind === "full-time") return "Nobody's finished today's Daily yet.";
  return "No Daily scheduled today. Check the Days tab.";
}
