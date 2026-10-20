import { Fragment, isValidElement, type ReactNode } from "react";
import { Fabric, SHIRT, type Kit } from "@/components/daily/ShirtBack";

// The Daily's kit shirt as a standalone SVG string, for server-drawn images.
// It reuses the shirt's own Fabric so a teaser shirt and an app shirt are the
// same drawing. Lettering is left off: the image sets it in real fonts on top.

const NAVY = "#0c1330";

// SVG attributes React writes in camelCase.
const KEEP_CASE = new Set(["viewBox"]);
const attrName = (key: string) => (KEEP_CASE.has(key) ? key : key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`));
const esc = (v: string) => v.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

/** Serialises a tree of SVG elements and plain function components. */
export function toSvg(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return esc(String(node));
  if (Array.isArray(node)) return node.map(toSvg).join("");
  if (!isValidElement(node)) return "";
  const { children, ...props } = node.props as { children?: ReactNode } & Record<string, unknown>;
  if (node.type === Fragment) return toSvg(children);
  if (typeof node.type === "function") return toSvg((node.type as (p: unknown) => ReactNode)(node.props));
  const attrs = Object.entries(props)
    .filter(([key, v]) => key !== "key" && v !== undefined && v !== null && v !== false)
    .map(([key, v]) => ` ${attrName(key)}="${esc(String(v))}"`)
    .join("");
  return `<${String(node.type)}${attrs}>${toSvg(children)}</${String(node.type)}>`;
}

/** A kit shirt (no lettering) with fixed ids, since each image is its own document. */
export function shirtSvg(kit: Kit): string {
  const body = toSvg(
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 104" width="100" height="104">
      <defs>
        <clipPath id="s">
          <path d={SHIRT} />
        </clipPath>
        <clipPath id="h">
          <rect x="50" y="0" width="50" height="104" />
        </clipPath>
      </defs>
      <g clipPath="url(#s)">
        <Fabric kit={kit} side={kit.half ? "left" : "both"} />
        {kit.half && (
          <g clipPath="url(#h)">
            <Fabric kit={kit.half} side="right" />
          </g>
        )}
        <path d="M68 0 L100 0 L100 104 L68 104 Z" fill={NAVY} opacity="0.08" />
        <path d="M24 37 L24 46 L14 43 Z M76 37 L76 46 L86 43 Z" fill={NAVY} opacity="0.12" />
        <path d="M24 100 L76 100" stroke={kit.trim ?? kit.number} strokeWidth="5" />
      </g>
      <path d={SHIRT} fill="none" stroke={NAVY} strokeWidth="2" strokeLinejoin="round" />
    </svg>,
  );
  return `data:image/svg+xml;base64,${Buffer.from(body).toString("base64")}`;
}

/** A slot still to fill: the shirt as a dashed outline on mist, like the app's. */
export function emptyShirtSvg(): string {
  const body = toSvg(
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 104" width="100" height="104">
      <path d={SHIRT} fill="#EDF0FF" stroke="#D9DFFF" strokeWidth="2.5" strokeLinejoin="round" strokeDasharray="4 3" />
    </svg>,
  );
  return `data:image/svg+xml;base64,${Buffer.from(body).toString("base64")}`;
}
