import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // "server-only" wirft außerhalb von React-Server-Komponenten – in Tests leer.
      "server-only": fileURLToPath(new URL("./src/test/empty.ts", import.meta.url)),
      "next/cache": fileURLToPath(new URL("./src/test/next-cache.ts", import.meta.url)),
      // next-auth importiert "next/server" ohne Endung – in Tests auf die echte Datei zeigen.
      "next/server": "next/server.js",
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
    env: { DATABASE_PATH: ":memory:" },
    server: { deps: { inline: ["next-auth", "@auth/core"] } },
  },
});
