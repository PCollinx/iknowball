import { ImageResponse } from "next/og";
import { APP_ICON_SRC } from "@/lib/og/logo";

// The home-screen icon: the mark on a light-teal tile. iOS rounds the corners.

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
     
    <img src={APP_ICON_SRC} width={180} height={180} alt="" />,
    size,
  );
}
