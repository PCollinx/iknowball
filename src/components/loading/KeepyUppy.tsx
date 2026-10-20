// The app's loading screen: a football doing keepy-uppies over its shadow
// (picked 21 Oct 2026 from the loading mocks). Pure CSS, so it costs no
// JavaScript, and it moves from the first frame, so even a one-second load
// shows the ball in play. It stands still for anyone who asks for reduced motion.

export function KeepyUppy({ label, caption = "Warming up…", className = "" }: { label: string; caption?: string; className?: string }) {
  return (
    <div role="status" aria-live="polite" className={`flex flex-col items-center py-12 ${className}`}>
      <div aria-hidden="true" className="relative h-[200px] w-[110px]">
        <div className="absolute top-0 left-[19px] h-[72px] w-[72px] origin-bottom motion-safe:animate-keepy-bounce motion-reduce:translate-y-[110px]">
          <Football className="h-full w-full motion-safe:animate-keepy-spin" />
        </div>
        <div className="absolute bottom-1.5 left-[23px] h-2.5 w-16 rounded-[50%] bg-navy opacity-30 motion-safe:animate-keepy-shadow" />
      </div>
      <div aria-hidden="true" className="w-[200px] border-t-[3px] border-navy" />
      <p className="mt-4 text-center">
        <span className="label block text-royal">{label}</span>
        <span className="mt-1 block font-display text-[32px] leading-none uppercase">{caption}</span>
      </p>
    </div>
  );
}

/** A plain match ball: a white ball with a navy centre panel and seams. */
function Football({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className}>
      <circle cx="50" cy="50" r="46" fill="#fff" stroke="var(--color-navy)" strokeWidth="5" />
      <path d="M50 30 L66 42 L60 61 L40 61 L34 42 Z" fill="var(--color-navy)" />
      <g stroke="var(--color-navy)" strokeWidth="4" fill="none" strokeLinejoin="round">
        <path d="M50 30 L50 7 M66 42 L88 35 M60 61 L74 83 M40 61 L26 83 M34 42 L12 35" />
        <path d="M38 6 L50 7 L62 6 M88 35 L94 48 M74 83 L62 94 M26 83 L38 94 M12 35 L6 48" />
      </g>
    </svg>
  );
}
