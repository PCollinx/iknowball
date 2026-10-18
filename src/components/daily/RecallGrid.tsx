import { ShirtBack, shirtName, type Kit } from "./ShirtBack";
import type { RecallReveal } from "@/lib/daily/data";

/** The finished squad: found shirts numbered in order, missed ones in red. */
export function RecallGrid({ reveal, kit, wide = false }: { reveal: RecallReveal; kit: Kit | null; wide?: boolean }) {
  return (
    <div className={`grid grid-cols-5 gap-x-1 gap-y-1.5 ${wide ? "lg:grid-cols-6 lg:gap-x-3 lg:gap-y-3" : ""}`}>
      {reveal.found.map((f, k) => (
        <ShirtBack key={f.id} kit={kit ?? undefined} name={shirtName(f.text)} num={k + 1} />
      ))}
      {reveal.missed.map((m) => (
        <ShirtBack key={m} name={shirtName(m)} num="×" state="miss" />
      ))}
    </div>
  );
}
