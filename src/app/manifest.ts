import type { MetadataRoute } from "next";

// The installable app (step 16): "Add to home screen" opens it full screen,
// on the white the whole app uses.

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "iKnowBall",
    short_name: "iKnowBall",
    description: "Prove you know ball. One Daily, one try.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [
      { src: "/icons/192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
