import { LoginForm } from "@/components/maker/LoginForm";
import { Logo } from "@/components/nav/SiteNav";

// The maker's sign-in (redesign, 31 Oct 2026): a staff-entrance ticket.
export default function MakerLogin() {
  return (
    <main className="mx-auto grid min-h-dvh max-w-[420px] content-center gap-3 px-4 py-8">
      <div className="grid grid-cols-[minmax(0,1fr)_64px] border-[3px] border-navy shadow-[5px_5px_0_var(--color-navy)]">
        <div className="grid gap-2 p-4">
          <span className="flex items-center gap-2">
            <Logo className="h-7" />
            <span className="label">Staff entrance</span>
          </span>
          <h1 className="font-display text-[40px] leading-[0.9] uppercase">
            The <span className="text-royal">Maker</span>
          </h1>
          <LoginForm />
        </div>
        <span className="grid rotate-180 place-items-center border-l-[3px] border-dashed border-white bg-navy font-display text-lg tracking-[0.1em] text-teal-light uppercase [writing-mode:vertical-rl]">
          Admins only
        </span>
      </div>
      <p className="text-center text-[13px] text-slate">Players never see this page. Admins are marked in the database.</p>
    </main>
  );
}
