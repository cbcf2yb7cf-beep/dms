import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import type { BetaMessage, MessageCreateParamsNonStreaming } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { __setClaudeForTests } from "./client";
import { prepare, run, recentRuns } from "./tasks";
import { applyTopics, slidesFromRun } from "./apply";
import { markdownToDoc } from "./markdown";
import { createDocument, getDocument, saveDocument, type SaveInput } from "@/lib/documents";
import { getPresentation } from "@/lib/presentations";
import { setSetting } from "@/lib/settings";
import { runAction } from "@/lib/actions/ai";

beforeAll(() => {
  process.env.DMS_DATA_DIR = mkdtempSync(join(tmpdir(), "dms-ai-"));
  process.env.DMS_LOCAL_TOKEN = "test"; // Lokal-Modus: requireUser liefert den lokalen Benutzer
  if (existsSync(resolve("data/bible.db"))) process.env.BIBLE_PATH = resolve("data/bible.db");
});
afterEach(() => __setClaudeForTests(null));

const calls: MessageCreateParamsNonStreaming[] = [];
const reply = (text: string, extra: Partial<BetaMessage> = {}) => {
  __setClaudeForTests(async (params) => {
    calls.push(params);
    return { id: "m", type: "message", role: "assistant", model: params.model, content: [{ type: "text", text, citations: null }], stop_reason: "end_turn", stop_sequence: null, usage: { input_tokens: 1000, output_tokens: 200 }, ...extra } as unknown as BetaMessage;
  });
};

const doc = (over: Partial<SaveInput>) => {
  const id = createDocument("predigt");
  saveDocument(
    id,
    {
      title: "Vergebung unter Geschwistern",
      content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Wer vergibt, dem wird vergeben. Petrus fragte: Wie oft soll ich vergeben? Mt 18,21." }] }, { type: "bibleBlock", attrs: { reference: "Mt 18,22", translation: "Luther 1912" }, content: [{ type: "paragraph", content: [{ type: "text", text: "Jesus sprach zu ihm …" }] }] }] },
      type: "predigt", status: "gehalten", heldOn: "2024-03-10", occasion: "Gottesdienst", place: "WHV", series: "", mainRef: "Mt 18,21-35", summary: "", favorite: false, topics: ["Vergebung"], tags: [],
      ...over,
    },
    Date.now() + 1000,
    { force: true },
  );
  return id;
};

describe("Assistent", () => {
  it("Vorbereiten ruft Claude NICHT auf und zeigt Inhalt, Modell und Kosten", () => {
    let called = false;
    __setClaudeForTests(async () => {
      called = true;
      throw new Error("darf nicht passieren");
    });
    const id = doc({});
    const p = prepare({ task: "zusammenfassung", documentId: id });
    expect(called).toBe(false);
    expect(p.modelName).toBe("Claude Opus 5.5"); // Standard
    expect(p.content).toContain("Petrus fragte");
    expect(p.content).toContain("<dokument>");
    expect(p.estCostUsd).toBeGreaterThan(0);
  });

  it("Senden: Opus mit Ausweichmodell bei Ablehnung, Haiku ohne; Kosten aus usage", async () => {
    const id = doc({});
    reply("Kurze Zusammenfassung.");
    const r = await run({ task: "zusammenfassung", documentId: id });
    expect(r).toMatchObject({ status: "ok", text: "Kurze Zusammenfassung.", inputTokens: 1000, outputTokens: 200 });
    expect(r.costUsd).toBeCloseTo((1000 * 4 + 200 * 20) / 1e6);
    expect(calls.at(-1)).toMatchObject({ model: "claude-opus-5-5", fallbacks: "default", betas: ["server-side-fallback-2026-07-01"], output_config: { effort: "low" } });
    expect("thinking" in calls.at(-1)!).toBe(false);

    setSetting("ai.model", "claude-haiku-5-5");
    reply("ok");
    await run({ task: "zusammenfassung", documentId: id });
    expect(calls.at(-1)!.model).toBe("claude-haiku-5-5");
    expect("fallbacks" in calls.at(-1)!).toBe(false);
    setSetting("ai.model", "claude-opus-5-5");
  });

  it("Verlauf: bei gleicher Millisekunde gilt die Speicherreihenfolge", async () => {
    const id = doc({});
    const realNow = Date.now;
    const fixed = realNow();
    Date.now = () => fixed; // alle Läufe in derselben Millisekunde (wie auf schnellen Rechnern)
    try {
      reply("eins");
      await run({ task: "zusammenfassung", documentId: id });
      reply("zwei");
      await run({ task: "zusammenfassung", documentId: id });
      reply("drei");
      await run({ task: "zusammenfassung", documentId: id });
    } finally {
      Date.now = realNow;
    }
    expect(recentRuns(3).map((r) => r.result)).toEqual(["drei", "zwei", "eins"]);
  });

  it("Ablehnung und Fehler werden verständlich gemeldet und protokolliert", async () => {
    const id = doc({});
    reply("", { stop_reason: "refusal" });
    expect((await run({ task: "zusammenfassung", documentId: id })).status).toBe("abgelehnt");
    __setClaudeForTests(async () => {
      throw new Error("401 authentication_error");
    });
    expect((await run({ task: "zusammenfassung", documentId: id })).text).toMatch(/Schlüssel ist ungültig/);
    reply("{kaputt");
    expect((await run({ task: "themen", documentId: id })).status).toBe("fehler");
    expect(recentRuns(3).map((r) => r.status)).toEqual(["fehler", "fehler", "abgelehnt"]);
  });

  it("Archivfrage: lokale Suche, nur Ausschnitte der gewählten Dokumente, Quellen nummeriert", async () => {
    const a = doc({ title: "Vergebung A" });
    const b = doc({ title: "Vergebung B" });
    const p = prepare({ task: "archivfrage", question: "Was habe ich über Vergebung gesagt?" });
    expect(p.candidates?.map((c) => c.id)).toEqual(expect.arrayContaining([a, b]));
    expect(p.content).toContain("Ausschnitte:");
    reply("Du betonst die unbegrenzte Vergebung [1].");
    const r = await run({ task: "archivfrage", question: "Was habe ich über Vergebung gesagt?", documentIds: [b] });
    expect(r.sources).toEqual([{ id: b, title: "Vergebung B" }]);
    const sent = String(calls.at(-1)!.messages[0].content);
    expect(sent).toContain("Vergebung B");
    expect(sent).not.toContain("Vergebung A");
  });

  it("Themen übernehmen ergänzt, Folienentwurf wird Präsentation mit Verstext aus der Bibel", async () => {
    const id = doc({});
    applyTopics(id, ["Gnade", "vergebung"]);
    expect(getDocument(id)!.topics).toEqual(["Gnade", "Vergebung"]);

    reply(JSON.stringify({ folien: [
      { art: "titel", titel: "Vergebung", untertitel: "Mt 18", punkte: [], stelle: "", text: "", notizen: "" },
      { art: "bibel", titel: "", untertitel: "", punkte: [], stelle: "Joh 3,16", text: "", notizen: "langsam lesen" },
      { art: "punkte", titel: "Wie oft?", untertitel: "", punkte: ["Immer wieder", "Von Herzen"], stelle: "", text: "", notizen: "" },
    ] }));
    const r = await run({ task: "folien", documentId: id });
    expect(calls.at(-1)!.output_config?.format?.type).toBe("json_schema");
    const p = getPresentation(slidesFromRun(r.runId))!;
    expect(p.slides.map((s) => s.kind)).toEqual(["titel", "bibel", "punkte"]);
    const verse = p.slides[1];
    expect(verse).toMatchObject({ reference: "Joh 3,16", notes: "langsam lesen" });
    if (process.env.BIBLE_PATH) expect(verse.kind === "bibel" && verse.text).toMatch(/Also hat Gott die Welt geliebt/);
  });

  it("Senden ohne Bestätigung wird abgelehnt (Server Action)", async () => {
    const id = doc({});
    let called = false;
    __setClaudeForTests(async () => {
      called = true;
      throw new Error("nein");
    });
    const fd = new FormData();
    fd.set("task", "zusammenfassung");
    fd.set("documentId", id);
    expect(await runAction(undefined, fd)).toEqual({ error: "Nicht bestätigt." });
    expect(called).toBe(false);
  });

  it("Markdown der Antworten wird Editor-Inhalt", () => {
    const d = markdownToDoc("## Einleitung\n- **Punkt** eins\n- zwei\n\n### Teil\nText.");
    expect(d.content?.map((n) => n.type)).toEqual(["heading", "bulletList", "heading", "paragraph"]);
  });
});
