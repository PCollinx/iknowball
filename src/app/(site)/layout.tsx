import { SiteFooter } from "@/components/nav/SiteFooter";
import { SiteNav } from "@/components/nav/SiteNav";

// The frame for every public screen (step 0 of docs/launch-plan.md): the
// navbar above and the footer below, with the page filling the space between.
// The maker (/maker) sits outside this group and keeps its own admin bar.

export default function SiteLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteNav />
      <div className="flex flex-1 flex-col">{children}</div>
      <SiteFooter />
    </div>
  );
}
