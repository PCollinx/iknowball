import { ImageResponse } from "next/og";
import { BADGE_SRC } from "@/lib/og/logo";

// The whistle's badge: the small one-colour icon Android shows in the status bar.
export function GET() {
  // eslint-disable-next-line @next/next/no-img-element -- drawn by next/og, not a page
  return new ImageResponse(<img src={BADGE_SRC} width={96} height={96} alt="" />, { width: 96, height: 96 });
}
