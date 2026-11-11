import type { Metadata } from "next";
import { Suspense } from "react";
import { UnsubscribeForm } from "./UnsubscribeForm";

// The launch email's unsubscribe link. A button, not the link itself, does it,
// so a mail scanner opening the link doesn't unsubscribe anyone.

export const metadata: Metadata = { title: "Unsubscribe · iKnowBall", robots: { index: false } };

export default function UnsubscribePage({ params }: { params: Promise<{ token: string }> }) {
  return (
    <main className="mx-auto w-full max-w-[560px] flex-1 px-4 pt-6 pb-10">
      <span className="label text-royal">Emails</span>
      <h1 className="mt-0.5 border-b-4 border-double border-navy pb-2 font-display text-[44px] leading-[0.86] uppercase">Unsubscribe</h1>
      <p className="mt-3 text-lg">We only promised one email, the one on launch day. Tap below and we won&apos;t send you any more.</p>
      <Suspense>
        <Token params={params} />
      </Suspense>
    </main>
  );
}

async function Token({ params }: { params: Promise<{ token: string }> }) {
  return <UnsubscribeForm token={(await params).token} />;
}
