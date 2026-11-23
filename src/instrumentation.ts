export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { bootstrap } = await import("./db/bootstrap");
    await bootstrap();
    // Mac-App: Claude-Schlüssel kommt nach dem Speichern als Nachricht vom Hauptprozess (ohne Neustart).
    const port = (process as unknown as { parentPort?: { on: (ev: "message", fn: (e: { data: unknown }) => void) => void } }).parentPort;
    port?.on("message", (e) => {
      const msg = e.data as { type?: string; key?: string } | undefined;
      if (msg?.type === "api-key") process.env.ANTHROPIC_API_KEY = typeof msg.key === "string" ? msg.key : "";
    });
  }
}
