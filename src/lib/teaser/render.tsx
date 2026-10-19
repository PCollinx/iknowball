import { ImageResponse } from "next/og";
import type { Kit } from "@/components/daily/ShirtBack";
import { ogFonts } from "@/lib/og/fonts";
import { FORMATS, type Teaser } from "./layout";
import { TeaserImage } from "./TeaserImage";

/** The teaser as a PNG response. */
export async function renderTeaser(t: Teaser, kit: Kit, headers?: Record<string, string>): Promise<ImageResponse> {
  return new ImageResponse(<TeaserImage t={t} kit={kit} />, { ...FORMATS[t.format], headers, fonts: await ogFonts() });
}
