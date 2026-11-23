// Modelle und Preise (USD je 1 Mio. Tokens, Anthropic-API, Stand 2026-11).
// Standard ist Claude Opus 5.5; in den Einstellungen umstellbar.

export const MODELS = [
  { id: "claude-opus-5-5", name: "Claude Opus 5.5", note: "beste Qualität (Standard)", input: 4, output: 20, fallback: true },
  { id: "claude-sonnet-5-5", name: "Claude Sonnet 5.5", note: "schnell und günstiger", input: 2, output: 10, fallback: true },
  { id: "claude-haiku-5-5", name: "Claude Haiku 5.5", note: "sehr günstig, für einfache Aufgaben", input: 0.1, output: 0.5, fallback: false },
] as const;

export type ModelId = (typeof MODELS)[number]["id"];
export const DEFAULT_MODEL: ModelId = "claude-opus-5-5";
export const modelInfo = (id: string) => MODELS.find((m) => m.id === id) ?? MODELS[0];

/** Kosten in USD (bei einem Ausweichmodell nach Ablehnung ist das eine Näherung). */
export function costUsd(model: string, inputTokens: number, outputTokens: number): number {
  const m = modelInfo(model);
  return (inputTokens * m.input + outputTokens * m.output) / 1_000_000;
}

export const formatUsd = (v: number) => (v < 0.01 ? "< 0,01 $" : `${v.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $`);
