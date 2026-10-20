import { readFile } from "node:fs/promises";
import { join } from "node:path";

// The app's own fonts as TTF for next/og (Satori can't read next/font's
// woff2). Both are OFL, from Google Fonts.
const font = (file: string) => readFile(join(process.cwd(), "src/assets/fonts", file));
const files = Promise.all([font("BigShoulders-900.ttf"), font("Barlow-400.ttf"), font("Barlow-600.ttf")]);

export const DISPLAY = "Big Shoulders";
export const BODY = "Barlow";

/** Fonts for an ImageResponse: Big Shoulders 900, Barlow 400 and 600. */
export async function ogFonts() {
  const [display, regular, semibold] = await files;
  return [
    { name: DISPLAY, data: display, weight: 900 as const, style: "normal" as const },
    { name: BODY, data: regular, weight: 400 as const, style: "normal" as const },
    { name: BODY, data: semibold, weight: 600 as const, style: "normal" as const },
  ];
}

/** The theme's colours, for images drawn outside the CSS. */
export const C = {
  navy: "#0C1330",
  royal: "#2440FF",
  teal: "#00A3A3",
  tealLight: "#7FE3E0",
  mist: "#EDF0FF",
  track: "#D9DFFF",
  red: "#D7263D",
};
