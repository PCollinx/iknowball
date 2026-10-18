import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import type { Kit } from "@/components/daily/ShirtBack";
import { FORMATS, type Teaser } from "./layout";
import { TeaserImage } from "./TeaserImage";

// The app's own fonts as TTF (Satori can't read next/font's woff2). Both are
// OFL, from Google Fonts.
const font = (file: string) => readFile(join(process.cwd(), "src/assets/fonts", file));
const fonts = Promise.all([font("BigShoulders-900.ttf"), font("Barlow-400.ttf"), font("Barlow-600.ttf")]);

/** The teaser as a PNG response. */
export async function renderTeaser(t: Teaser, kit: Kit, headers?: Record<string, string>): Promise<ImageResponse> {
  const [display, regular, semibold] = await fonts;
  return new ImageResponse(<TeaserImage t={t} kit={kit} />, {
    ...FORMATS[t.format],
    headers,
    fonts: [
      { name: "Big Shoulders", data: display, weight: 900, style: "normal" },
      { name: "Barlow", data: regular, weight: 400, style: "normal" },
      { name: "Barlow", data: semibold, weight: 600, style: "normal" },
    ],
  });
}
