import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "The Maker · iKnowBall",
  robots: { index: false, follow: false },
};

export default function MakerLayout({ children }: { children: React.ReactNode }) {
  return children;
}
