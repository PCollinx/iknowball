"use client";

/** "Start one" in the album's empty slot: takes you to the start form, ready to type a name. */
export function StartOne() {
  function go() {
    const input = document.getElementById("league-name");
    if (!(input instanceof HTMLInputElement)) return;
    input.scrollIntoView({ block: "center", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    input.focus({ preventScroll: true });
  }

  return (
    <button type="button" onClick={go} className="btn-teal btn-press px-2.5 py-1 font-display text-[17px] uppercase lg:text-lg">
      Start one
    </button>
  );
}
