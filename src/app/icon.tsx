import { ImageResponse } from "next/og";
import { LOGO_RATIO, LOGO_SRC } from "@/lib/og/logo";

// The browser tab's icon: the No. 10 shirt with its nameplate, as at every size.

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", alignItems: "center", justifyContent: "center" }}>
        { }
        <img src={LOGO_SRC} width={32 * LOGO_RATIO} height={32} alt="" />
      </div>
    ),
    size,
  );
}
