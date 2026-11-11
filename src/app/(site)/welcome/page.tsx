import type { Metadata } from "next";
import { Welcome } from "@/components/home/Welcome";

// The welcome for everyone, players who have played included: the navbar's
// 00 Home. / shows the same page to new players only (src/proxy.ts).

export const metadata: Metadata = {
  title: "Welcome · iKnowBall",
  description: "How iKnowBall works: the Daily, Clash, the League and your shirt, plus the questions everyone asks.",
};

export default function WelcomePage() {
  return <Welcome />;
}
