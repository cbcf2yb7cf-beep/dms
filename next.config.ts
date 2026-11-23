import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Native SQLite-Bindung nicht bündeln, sondern zur Laufzeit aus node_modules laden.
  serverExternalPackages: ["better-sqlite3", "mammoth", "word-extractor", "unpdf", "pptxgenjs"],
  experimental: {
    // Import: Anfragen laufen durch den Proxy (Zugriffsprüfung), der den Inhalt puffert.
    // Größte PowerPoint im Bestand ~32 MB.
    proxyClientMaxBodySize: "100mb",
  },
  poweredByHeader: false,
  // Mac-App: eigenständiger Server (ohne Docker) für die Electron-Hülle, siehe desktop/.
  output: process.env.DMS_DESKTOP ? "standalone" : undefined,
};

export default nextConfig;
