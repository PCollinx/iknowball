import { LoginForm } from "@/components/maker/LoginForm";

export default function MakerLogin() {
  return (
    <main className="mx-auto min-h-dvh max-w-[440px] px-4">
      <div className="border-b border-navy pt-3.5 pb-2">
        <span className="label">The Maker · Back office</span>
      </div>
      <h1 className="mt-6 font-display text-[64px] leading-[0.9] uppercase">
        Staff <span className="text-royal">only</span>
      </h1>
      <p className="mt-3 text-lg">Sign in with the admin account to make Dailies.</p>
      <LoginForm />
    </main>
  );
}
