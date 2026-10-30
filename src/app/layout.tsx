import type { Metadata, Viewport } from "next";
import { PwaScript } from "@/components/pwa/PwaScript";
import { fontVariables } from "./fonts";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "iKnowBall",
  description: "Prove you know ball. One Daily, one try.",
  // Added to an iPhone's home screen, it opens full screen under this name.
  appleWebApp: { capable: true, title: "iKnowBall", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={fontVariables}>
      <body className="antialiased">
        <PwaScript />
        {children}
      </body>
    </html>
  );
}
