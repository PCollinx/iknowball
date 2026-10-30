import Link from "next/link";

// iPhone and iPad have no install button for websites: it's done by hand
// from Safari's Share menu. Three numbered stickers, as in the mock.

const STEP = "flex items-center gap-2.5 border-2 border-navy bg-mist px-2 py-1.5 text-sm leading-snug";

export function IosSteps({ guest, inApp }: { guest: boolean; inApp: boolean }) {
  return (
    <>
      <ol className="grid gap-2">
        <li className={`${STEP} -rotate-[1.5deg]`}>
          <Num n={1} />
          <span>
            Tap Share <ShareIcon /> (under ••• if you don&apos;t see it)
          </span>
        </li>
        <li className={`${STEP} rotate-1`}>
          <Num n={2} />
          <span>
            Pick <b className="font-semibold">Add to Home Screen</b>
          </span>
        </li>
        <li className={`${STEP} -rotate-[0.5deg]`}>
          <Num n={3} />
          <span>
            Tap <b className="font-semibold">Add</b>. The No. 10 shirt is on your home screen.
          </span>
        </li>
      </ol>
      {inApp && (
        <p className="mt-2.5 flex gap-2.5 border-2 border-navy bg-navy px-3 py-2.5 text-sm leading-snug text-white">
          <span className="font-display text-xl leading-none text-teal-light" aria-hidden="true">
            !
          </span>
          <span>
            Opened this from X or WhatsApp? Tap <b className="font-semibold">•••</b> and <b className="font-semibold">Open in Safari</b> first.
            Their own browsers can&apos;t add it.
          </span>
        </p>
      )}
      {guest && (
        <p className="mt-2 text-sm leading-snug">
          Playing as a guest?{" "}
          <Link href="/profile" className="font-semibold text-royal underline underline-offset-[3px]">
            Save your shirt
          </Link>{" "}
          first: the home-screen app can start you signed out.
        </p>
      )}
    </>
  );
}

function Num({ n }: { n: number }) {
  return <span className="w-[18px] shrink-0 font-display text-[28px] leading-none text-royal">{n}</span>;
}

function ShareIcon() {
  return (
    <svg width="16" height="18" viewBox="0 0 16 18" fill="none" stroke="currentColor" strokeWidth="1.8" role="img" aria-label="the Share icon" className="inline align-[-3px]">
      <path d="M8 1v11M4.5 4.5 8 1l3.5 3.5" />
      <path d="M5 7.5H2v9h12v-9h-3" />
    </svg>
  );
}
