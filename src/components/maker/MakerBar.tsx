import Link from "next/link";
import { signOut } from "@/app/maker/actions";

// The maker's masthead: the same printed-programme rule as The Daily.
export function MakerBar({ right }: { right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-navy pt-3.5 pb-2">
      <Link href="/maker" className="label">
        The Maker · Back office
      </Link>
      <div className="flex items-center gap-4">
        {right}
        <Link href="/maker/teaser" className="label text-navy/60 underline underline-offset-[3px]">
          Teasers
        </Link>
        <form action={signOut}>
          <button type="submit" className="label text-navy/60 underline underline-offset-[3px]">
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
