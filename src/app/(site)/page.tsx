import { Welcome } from "@/components/home/Welcome";

// Home is the welcome (Collins, 11 Nov 2026): how the app works, a link to
// each part and the questions. A player who has played a Daily never sees it
// here: src/proxy.ts sends / straight to /daily. The navbar's 00 Home opens
// the same page at /welcome, so they can still find it.

export default function Home() {
  return <Welcome />;
}
