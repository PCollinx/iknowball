import { ShirtBack, type Kit } from "@/components/daily/ShirtBack";

// "VAR check" (step 11, option A, picked by Collins on 27 Oct 2026): the 404
// and the error screens are the VAR monitor. A strip on top says what's being
// checked, the screen shows it, and the decision runs along the bottom.

const DEFENDER: Kit = { shirt: "#0C1330", number: "#FFFFFF", trim: "#7FE3E0" };

type Props = {
  strip: string;
  /** The strip's colour: light teal for a check, yellow for a fault. */
  stripClass: string;
  verdict: string;
  verdictClass: string;
  /** The strip's corner: "● Live" while the monitor is on. */
  status?: string;
  children: React.ReactNode;
};

export function VarBox({ strip, stripClass, verdict, verdictClass, status = "● Live", children }: Props) {
  return (
    <section className="border-[3px] border-navy bg-navy shadow-[6px_6px_0_var(--color-navy)]">
      <div className={`flex items-center justify-between px-2.5 py-1.5 ${stripClass}`}>
        <span className="font-display text-lg uppercase">{strip}</span>
        <span className="label">{status}</span>
      </div>
      <div className="p-2">{children}</div>
      <div className={`flex items-center justify-between px-3 py-2 font-display text-[26px] text-white uppercase ${verdictClass}`}>
        <span>Decision</span>
        <span>{verdict}</span>
      </div>
    </section>
  );
}

/** The offside freeze-frame: a defender on the last man's line, and your page
 * as a red "404" shirt beyond the red one. */
export function OffsideScreen() {
  return (
    <div className="relative h-[200px] overflow-hidden bg-mist lg:h-[300px]" role="img" aria-label="Your page is beyond the last man: offside">
      {[0, 25, 50, 75].map((y) => (
        <span key={y} className="absolute inset-x-0 h-[12.5%] bg-track/50" style={{ top: `${y}%` }} />
      ))}
      <span className="absolute inset-y-0 left-[44%] w-[3px] bg-royal" />
      <span className="absolute inset-y-0 left-[58%] w-[3px] bg-red-card" />
      <div className="absolute top-[22%] left-[24%] w-[22%] lg:w-[20%]">
        <ShirtBack kit={DEFENDER} lettering="tag" name="Defender" />
      </div>
      <div className="absolute top-[14%] left-[62%] w-[22%] rotate-[4deg] lg:w-[20%]">
        <ShirtBack state="miss" num="404" />
      </div>
      <span className="label absolute right-[57%] bottom-2 text-royal">Last man</span>
      <span className="label absolute bottom-2 left-[60%] text-red-card">Your page</span>
    </div>
  );
}

/** A technical fault: the test card's colour bars, "Signal lost" (or what `label` says). */
export function SignalLost({ label = "Signal lost" }: { label?: string }) {
  return (
    <div className="relative flex h-[200px] lg:h-[260px]" role="img" aria-label={label}>
      {["bg-white", "bg-teal-light", "bg-[#F4C21B]", "bg-teal", "bg-[#C04CFF]", "bg-red-card", "bg-royal"].map((c) => (
        <span key={c} className={`flex-1 ${c}`} />
      ))}
      <span className="absolute top-1/2 left-1/2 -translate-1/2 -rotate-2 bg-navy px-3.5 py-2 font-display text-[26px] whitespace-nowrap text-white uppercase">
        {label}
      </span>
    </div>
  );
}
