import Link from "next/link";

// The sticker look for home cards: a white card with a navy frame, a hard
// shadow and a slight tilt that straightens on hover. A slot is the dashed
// album space it's stuck in, with a caption underneath.

const FRAME =
  "block border-[3px] border-navy bg-white p-1.5 text-navy shadow-[5px_5px_0_var(--color-navy)] transition-[rotate,translate] duration-150 hover:translate-y-[-4px] hover:rotate-0 lg:p-2 lg:shadow-[7px_7px_0_var(--color-navy)]";

export function Sticker({ href, className = "", children }: { href?: string; className?: string; children: React.ReactNode }) {
  const inner = <div className="flex h-full flex-col border-2 border-navy">{children}</div>;
  return href ? (
    <Link href={href} className={`${FRAME} ${className}`}>
      {inner}
    </Link>
  ) : (
    <div className={`${FRAME} ${className}`}>{inner}</div>
  );
}

/** The sticker's number in the corner, like an album's, and whatever sits opposite. */
export function StickerHead({ n, name, children }: { n: string; name: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between px-2.5 pt-2.5 lg:px-3 lg:pt-3">
      <div className="text-center leading-none">
        <div className="font-display text-[40px] lg:text-[50px]">{n}</div>
        <div className="label text-[10px] lg:text-[11px]">{name}</div>
      </div>
      {children}
    </div>
  );
}

export function StickerSlot({ caption, aside, children }: { caption: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="border-2 border-dashed border-[#9AA6C8] p-2 lg:p-2.5">{children}</div>
      <div className="label mt-2 flex justify-between gap-3 px-1 text-[11px] lg:text-xs">
        <span>{caption}</span>
        {aside}
      </div>
    </div>
  );
}
