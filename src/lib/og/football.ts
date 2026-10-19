import { CENTRE, EDGE, SEAMS } from "@/components/clash/Football";
import { C } from "./fonts";

// The Clash football and missed-kick cross as SVG data URIs for next/og,
// drawn the same as the Football component and KickRow's cross.

const uri = (svg: string) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

export const FOOTBALL_SRC = uri(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><defs><clipPath id="b"><circle cx="12" cy="12" r="10.4"/></clipPath></defs>` +
    `<circle cx="12" cy="12" r="10.4" fill="#ffffff"/>` +
    `<g clip-path="url(#b)" fill="${C.navy}" stroke="${C.navy}" stroke-width="0.8" stroke-linejoin="round"><path d="${SEAMS}" fill="none"/><polygon points="${CENTRE}"/>` +
    EDGE.map((p) => `<polygon points="${p}"/>`).join("") +
    `</g><circle cx="12" cy="12" r="10.4" fill="none" stroke="${C.navy}" stroke-width="1.5"/></svg>`,
);

export const MISS_SRC = uri(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10.4" fill="#ffffff" stroke="${C.red}" stroke-width="1.8"/>` +
    `<path d="M8 8 L16 16 M16 8 L8 16" stroke="${C.red}" stroke-width="2.6" stroke-linecap="round"/></svg>`,
);
