import Link from "next/link";

export function ClashMasthead({ right }: { right: string }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-navy pt-3.5 pb-2">
      <Link href="/clash" className="label">
        Clash · Sprint
      </Link>
      <span className="label">{right}</span>
    </div>
  );
}
