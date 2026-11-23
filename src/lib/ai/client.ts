import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { BetaMessage, MessageCreateParamsNonStreaming } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { modelInfo } from "./models";

// Einziger Ort, an dem Claude aufgerufen wird. Der Schlüssel kommt aus ANTHROPIC_API_KEY
// (Mac-App: aus dem macOS-Schlüsselbund, beim Start bzw. nach dem Speichern übergeben).

export const aiConfigured = () => Boolean(process.env.ANTHROPIC_API_KEY?.trim()) || Boolean(testCall);

type Call = (params: MessageCreateParamsNonStreaming) => Promise<BetaMessage>;
let testCall: Call | null = null;
/** Nur für Tests: Claude-Aufruf ersetzen. */
export function __setClaudeForTests(fn: Call | null) {
  testCall = fn;
}

let client: Anthropic | null = null;
let clientKey = "";

export type ClaudeRequest = {
  model: string;
  system: string;
  content: string;
  effort: "low" | "medium" | "high";
  maxTokens: number;
  schema?: Record<string, unknown>;
};

export async function callClaude(req: ClaudeRequest): Promise<BetaMessage> {
  const params: MessageCreateParamsNonStreaming = {
    model: req.model,
    max_tokens: req.maxTokens,
    system: req.system,
    messages: [{ role: "user", content: req.content }],
    output_config: { effort: req.effort, ...(req.schema ? { format: { type: "json_schema", schema: req.schema } } : {}) },
    // Bei einer Sicherheits-Ablehnung serverseitig auf ein empfohlenes Modell ausweichen (nicht bei Haiku).
    ...(modelInfo(req.model).fallback ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const } : {}),
  };
  if (testCall) return testCall(params);
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  if (!key) throw new Error("Kein Claude-Schlüssel hinterlegt (Einstellungen → Assistent).");
  if (!client || clientKey !== key) {
    client = new Anthropic({ apiKey: key, timeout: 5 * 60 * 1000, maxRetries: 2 });
    clientKey = key;
  }
  return client.beta.messages.create(params);
}
