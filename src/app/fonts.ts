import { Barlow, Big_Shoulders } from "next/font/google";

// Self-hosted at build time by next/font, so no requests go to Google and no JS
// is added. Shared by the root layout and the last-resort error screen, which
// replaces it.
const display = Big_Shoulders({
  subsets: ["latin"],
  weight: "900",
  variable: "--font-big-shoulders",
  // next/font has no fallback metrics for Big Shoulders, so it can't size a fallback to match.
  adjustFontFallback: false,
  fallback: ["Impact", "Arial Narrow", "sans-serif"],
});

const body = Barlow({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-barlow",
});

export const fontVariables = `${display.variable} ${body.variable}`;
