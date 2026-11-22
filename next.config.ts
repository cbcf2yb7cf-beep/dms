import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Native SQLite-Bindung nicht bündeln, sondern zur Laufzeit aus node_modules laden.
  serverExternalPackages: ["better-sqlite3"],
  poweredByHeader: false,
};

export default nextConfig;
