/** A drawn ↗. The character itself is an emoji on iOS (a blue tile), so the app
 * never prints it (Collins, 13 Nov 2026). Sized in em to sit in its line of text. */
export function ArrowUpRight({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="square"
      aria-hidden="true"
      className={`inline-block size-[0.8em] shrink-0 align-[-0.05em] ${className}`}
    >
      <path d="M4 12 12 4M5.5 4H12v6.5" />
    </svg>
  );
}
