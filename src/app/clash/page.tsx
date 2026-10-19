import type { Metadata } from "next";
import { ClashKickOff } from "@/components/clash/KickOff";

export const metadata: Metadata = {
  title: "Clash · iKnowBall",
  description: "Sixty seconds of Higher or Lower. Send the link and settle it.",
};

export default function ClashPage() {
  return <ClashKickOff />;
}
