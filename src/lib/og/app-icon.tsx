import { ImageResponse } from "next/og";
import { APP_ICON_SRC } from "./logo";

/** The home-screen icon as a PNG of any size, for the web manifest. The mark
 * sits inside the maskable safe circle (69 of its 72 units), so Android can
 * crop it to a circle or squircle and still keep the whole shirt. */
export function appIconPng(size: number) {
  // eslint-disable-next-line @next/next/no-img-element -- drawn by next/og, not a page
  return new ImageResponse(<img src={APP_ICON_SRC} width={size} height={size} alt="" />, { width: size, height: size });
}
