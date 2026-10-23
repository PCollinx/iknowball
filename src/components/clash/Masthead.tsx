import Link from "next/link";

export function ClashMasthead({ left = "Clash · Sprint", right }: { left?: string; right: string }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-navy pt-3.5 pb-2">
      <Link href="/clash" className="label">
        {left}
      </Link>
      <span className="label">{right}</span>
    </div>
  );
}
