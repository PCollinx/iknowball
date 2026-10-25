import { CENTRE, EDGE, SEAMS } from "@/components/clash/Football";
import { C } from "./fonts";

// The Clash football and a missed kick as SVG data URIs for next/og, drawn
// the same as the Football component and KickRow.

const uri = (svg: string) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

export const FOOTBALL_SRC = uri(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><defs><clipPath id="b"><circle cx="12" cy="12" r="10.4"/></clipPath></defs>` +
    `<circle cx="12" cy="12" r="10.4" fill="#ffffff"/>` +
    `<g clip-path="url(#b)" fill="${C.navy}" stroke="${C.navy}" stroke-width="0.8" stroke-linejoin="round"><path d="${SEAMS}" fill="none"/><polygon points="${CENTRE}"/>` +
    EDGE.map((p) => `<polygon points="${p}"/>`).join("") +
    `</g><circle cx="12" cy="12" r="10.4" fill="none" stroke="${C.navy}" stroke-width="1.5"/></svg>`,
);

/** A missed kick, as KickRow draws it: the ball faded, a red stroke through it. */
export const MISS_SRC = uri(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><defs><clipPath id="b"><circle cx="12" cy="12" r="10.4"/></clipPath></defs>` +
    `<g opacity="0.35"><circle cx="12" cy="12" r="10.4" fill="#ffffff"/>` +
    `<g clip-path="url(#b)" fill="${C.navy}" stroke="${C.navy}" stroke-width="0.8" stroke-linejoin="round"><path d="${SEAMS}" fill="none"/><polygon points="${CENTRE}"/>` +
    EDGE.map((p) => `<polygon points="${p}"/>`).join("") +
    `</g><circle cx="12" cy="12" r="10.4" fill="none" stroke="${C.navy}" stroke-width="1.5"/></g>` +
    `<path d="M3.5 20.5 L20.5 3.5" stroke="${C.red}" stroke-width="3.2" stroke-linecap="round"/></svg>`,
);
