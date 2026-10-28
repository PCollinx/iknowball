import { toSvg } from "./shirt-svg";
import { SHIRT } from "@/components/daily/ShirtBack";

// The iKnowBall mark (A2, picked by Collins on 28 Oct 2026): the No. 10 shirt
// in navy with a teal sash, light-teal collar and cuffs, a light-teal 10 and
// "iKnowBall" on the hem's nameplate, at every size down to the 16 px tab.
// No royal: the app has enough blue already. Mocks:
// https://claude.ai/artifact/BCUq7vK7p7NRFQnyY3F1Hz
//
// It is one SVG, drawn as a data URI, so the navbar, footer, favicon, app icon
// and share images show the same thing. The lettering is outlines of Big
// Shoulders 900 (made with fontTools from src/assets/fonts/BigShoulders-900.ttf),
// so it needs no font wherever it's drawn.

const NAVY = "#0C1330";
const TEAL = "#00A3A3";
const TEAL_LIGHT = "#7FE3E0";

/** "10", 38 units, centred on x 47 with its baseline at y 62. */
const TEN =
  "M34.72 62V36.62H32.46L32.3 34.6L35.93 31.6H40.63V62ZM52.5 62.38Q48.51 62.38 46.36 60.39Q44.22 58.41 44.12 54.74Q44.05 52.01 44.03 49.33Q44.01 46.65 44.04 44.02Q44.06 41.39 44.12 38.82Q44.22 35.13 46.38 33.18Q48.55 31.22 52.5 31.22Q56.4 31.22 58.55 33.18Q60.71 35.13 60.82 38.82Q60.9 41.04 60.94 43.09Q60.97 45.15 60.97 47.09Q60.97 49.02 60.94 50.92Q60.9 52.82 60.82 54.74Q60.69 58.54 58.49 60.46Q56.28 62.38 52.5 62.38ZM52.5 57.74Q54.91 57.74 55.03 55.92Q55.18 52.77 55.23 49.9Q55.27 47.03 55.23 44.06Q55.18 41.1 55.03 37.72Q54.97 35.86 52.5 35.86Q49.99 35.86 49.94 37.76Q49.84 40.15 49.79 42.34Q49.75 44.54 49.75 46.68Q49.75 48.81 49.79 51.06Q49.84 53.3 49.94 55.81Q49.99 57.74 52.5 57.74Z";
/** "iKnowBall", 13 units, centred on the nameplate. */
const NAME =
  "M24.08 82.27V80.8H26.03V82.27ZM24.08 91.2V83.4H26.03V91.2ZM27.28 91.2V80.8H29.36L29.34 83.32L29.1 85.65H29.58L30.2 83.32L31.14 80.8H33.27L31.54 85.08L33.35 91.2H31.37L30.19 87.05L29.27 88.85V91.2ZM34.04 91.2V83.4H35.99V84.25H36.37Q36.66 83.78 36.99 83.52Q37.32 83.27 37.96 83.27Q38.83 83.27 39.31 83.78Q39.79 84.28 39.79 85.47V91.2H37.84V85.3Q37.84 84.99 37.65 84.84Q37.46 84.69 37.12 84.69Q36.82 84.69 36.47 84.84Q36.12 84.99 35.99 85.25V91.2ZM43.64 91.33Q42.66 91.33 42.06 91.07Q41.46 90.81 41.18 90.23Q40.9 89.66 40.85 88.72Q40.84 88.47 40.83 88.09Q40.82 87.71 40.82 87.28Q40.82 86.86 40.83 86.48Q40.84 86.1 40.85 85.87Q40.91 84.91 41.19 84.34Q41.47 83.77 42.07 83.52Q42.66 83.27 43.64 83.27Q44.66 83.27 45.25 83.54Q45.83 83.8 46.11 84.38Q46.38 84.95 46.43 85.87Q46.44 86.12 46.45 86.5Q46.46 86.88 46.46 87.31Q46.46 87.73 46.45 88.11Q46.44 88.48 46.43 88.72Q46.37 89.66 46.1 90.23Q45.83 90.81 45.24 91.07Q44.65 91.33 43.64 91.33ZM43.64 89.87Q44.09 89.87 44.28 89.7Q44.46 89.53 44.47 89.21Q44.49 88.64 44.5 88.16Q44.51 87.68 44.51 87.24Q44.51 86.8 44.5 86.34Q44.49 85.89 44.47 85.38Q44.46 85.06 44.28 84.9Q44.09 84.73 43.64 84.73Q43.21 84.73 43.01 84.91Q42.81 85.09 42.8 85.38Q42.79 85.78 42.78 86.24Q42.77 86.7 42.77 87.19Q42.77 87.68 42.78 88.19Q42.79 88.7 42.81 89.21Q42.82 89.53 43.02 89.7Q43.21 89.87 43.64 89.87ZM48.11 91.2 47.06 83.4H49.04L49.37 87.31L49.49 89.77H50.02L50.06 87.31L50.43 83.4H53.67L54.02 87.31L54.08 89.77H54.58L54.7 87.31L55.05 83.4H57.04L55.96 91.2H52.66L52.42 88.16L52.33 84.83H51.76L51.67 88.16L51.45 91.2ZM57.83 91.2V80.8H60.47Q61.93 80.8 62.6 81.39Q63.27 81.98 63.27 83.34Q63.27 83.52 63.27 83.69Q63.27 83.86 63.25 84.02Q63.21 84.73 62.94 85.15Q62.66 85.57 62.08 85.77V86.08Q62.68 86.27 62.96 86.7Q63.24 87.12 63.27 87.86Q63.28 88.07 63.28 88.26Q63.28 88.44 63.27 88.67Q63.21 90.02 62.57 90.61Q61.93 91.2 60.47 91.2ZM59.78 89.48H60.47Q60.88 89.48 61.1 89.27Q61.32 89.05 61.32 88.64Q61.32 88.46 61.32 88.29Q61.32 88.13 61.32 87.95Q61.32 87.31 61.12 87.04Q60.92 86.77 60.47 86.77H59.78ZM59.78 85.05H60.47Q60.88 85.05 61.1 84.77Q61.32 84.49 61.32 83.97Q61.32 83.78 61.32 83.6Q61.32 83.41 61.32 83.23Q61.32 82.89 61.1 82.7Q60.88 82.52 60.47 82.52H59.78ZM65.94 91.3Q65.02 91.3 64.59 90.88Q64.15 90.46 64.06 89.42Q64.05 89.31 64.05 89.13Q64.05 88.96 64.06 88.86Q64.11 88.33 64.32 87.95Q64.53 87.58 64.98 87.3Q65.43 87.02 66.19 86.77Q66.57 86.64 66.91 86.55Q67.26 86.47 67.71 86.36V85.4Q67.71 85.05 67.52 84.89Q67.33 84.73 66.93 84.73Q66.58 84.73 66.41 84.86Q66.24 85 66.22 85.31Q66.21 85.38 66.21 85.63Q66.2 85.88 66.21 86.12Q66.21 86.36 66.22 86.4H64.33Q64.33 86.33 64.32 86.06Q64.31 85.79 64.32 85.53Q64.35 84.75 64.61 84.25Q64.87 83.74 65.43 83.51Q66 83.27 66.99 83.27Q67.99 83.27 68.57 83.53Q69.14 83.8 69.38 84.37Q69.62 84.93 69.62 85.84L69.6 91.2H67.67V90.36H67.37Q67.13 90.85 66.82 91.08Q66.51 91.3 65.94 91.3ZM66.76 89.91Q67.04 89.91 67.29 89.77Q67.54 89.62 67.68 89.38L67.69 87.6Q67.43 87.66 67.17 87.73Q66.9 87.79 66.68 87.89Q66.28 88.04 66.16 88.3Q66.04 88.57 66.02 88.86Q66.02 89.02 66.02 89.08Q66.02 89.14 66.02 89.28Q66.06 89.59 66.24 89.75Q66.42 89.91 66.76 89.91ZM70.81 91.2V80.8H72.76V91.2ZM73.97 91.2V80.8H75.92V91.2Z";

/** The mark's own box: the shirt (100 × 104) with room for its outline. */
export const LOGO_VIEWBOX = "-2 -2 104 108";
export const LOGO_RATIO = 104 / 108;

/** The mark's shapes, in shirt units. `clip` names the clip path, unique per document. */
function Mark({ clip }: { clip: string }) {
  return (
    <>
      <defs>
        <clipPath id={clip}>
          <path d={SHIRT} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clip})`}>
        <rect width="100" height="104" fill={NAVY} />
        <path d="M80 0 L92 0 L72 104 L60 104 Z" fill={TEAL} />
        <path d="M3 24 L14 43 M97 24 L86 43" stroke={TEAL_LIGHT} strokeWidth="8" />
        <path d="M43 2 Q50 9 57 2" stroke={TEAL_LIGHT} strokeWidth="6" fill="none" />
        <path d="M24 100 L76 100" stroke={TEAL_LIGHT} strokeWidth="5" />
      </g>
      <path d={SHIRT} fill="none" stroke={NAVY} strokeWidth="2.5" strokeLinejoin="round" />
      {/* The 10 gets a navy edge, drawn under it. */}
      <path d={TEN} fill="none" stroke={NAVY} strokeWidth="2.5" strokeLinejoin="round" />
      <path d={TEN} fill={TEAL_LIGHT} />
      <rect x="18" y="74" width="64" height="24" fill={TEAL_LIGHT} stroke={NAVY} strokeWidth="2.5" />
      <path d={NAME} fill={NAVY} />
    </>
  );
}

const dataUri = (svg: string) => `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;

/** The mark on its own, as a data URI for an <img>. */
export const LOGO_SRC = dataUri(
  toSvg(
    <svg xmlns="http://www.w3.org/2000/svg" viewBox={LOGO_VIEWBOX} width="104" height="108">
      <Mark clip="ikb" />
    </svg>,
  ),
);

/** The home-screen icon: the mark on a light-teal tile with a white sash. Square, any size. */
export const APP_ICON_SRC = dataUri(
  toSvg(
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180" width="180" height="180">
      <rect width="180" height="180" fill={TEAL_LIGHT} />
      <path d="M137 0 L163 0 L141 180 L115 180 Z" fill="#FFFFFF" />
      <g transform="translate(26 24) scale(1.24)">
        <Mark clip="ikb" />
      </g>
    </svg>,
  ),
);
