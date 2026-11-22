import type { MetadataRoute } from "next";

// Grundlage für die installierbare App; Offline-Zwischenspeicher folgt in Phase 6.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "DMS – Predigten & Bibel",
    short_name: "DMS",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f1e7",
    theme_color: "#2a2520",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
