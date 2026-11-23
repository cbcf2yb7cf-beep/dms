"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { prepare, run, taskInputSchema, type Prepared, type RunResult, type TaskInput } from "@/lib/ai/tasks";
import { applySummary, applyTopics, outlineToDocument, slidesFromRun } from "@/lib/ai/apply";
import { setSetting } from "@/lib/settings";
import { MODELS } from "@/lib/ai/models";

export type AssistantState = { prepared?: Omit<Prepared, "schema">; result?: RunResult; error?: string; input?: TaskInput } | undefined;

function readInput(fd: FormData): TaskInput | string {
  const ids = String(fd.get("documentIds") ?? "").split(",").filter(Boolean);
  const raw = {
    task: String(fd.get("task") ?? ""),
    documentId: String(fd.get("documentId") ?? "") || undefined,
    otherId: String(fd.get("otherId") ?? "") || undefined,
    question: String(fd.get("question") ?? "") || undefined,
    documentIds: fd.get("documentIds") !== null ? ids : undefined,
  };
  const parsed = taskInputSchema.safeParse(raw);
  if (!parsed.success) {
    if (raw.task === "archivfrage") return "Bitte eine Frage mit mindestens 3 Zeichen eingeben.";
    if (raw.task === "vergleich") return "Bitte zwei Dokumente wählen.";
    return "Bitte ein Dokument wählen.";
  }
  return parsed.data;
}

/** Schritt 1: zeigen, was gesendet würde. Ruft Claude NICHT auf. */
export async function prepareAction(_prev: AssistantState, fd: FormData): Promise<AssistantState> {
  await requireUser();
  const input = readInput(fd);
  if (typeof input === "string") return { error: input };
  const { schema: _schema, ...prepared } = prepare(input);
  void _schema;
  return { prepared, input };
}

/** Schritt 2: nach ausdrücklicher Bestätigung an Claude senden. */
export async function runAction(_prev: AssistantState, fd: FormData): Promise<AssistantState> {
  await requireUser();
  if (fd.get("confirm") !== "1") return { error: "Nicht bestätigt." };
  const input = readInput(fd);
  if (typeof input === "string") return { error: input };
  const result = await run(input);
  revalidatePath("/assistent");
  return { result, input };
}

const uuid = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "");
  if (!/^[0-9a-f-]{36}$/.test(s)) throw new Error("Ungültige ID");
  return s;
};

export async function applySummaryAction(fd: FormData) {
  await requireUser();
  const id = uuid(fd.get("documentId"));
  applySummary(id, String(fd.get("text") ?? ""));
  revalidatePath(`/archiv/${id}`);
  redirect(`/archiv/${id}`);
}

export async function applyTopicsAction(fd: FormData) {
  await requireUser();
  const id = uuid(fd.get("documentId"));
  applyTopics(id, fd.getAll("topic").map(String));
  revalidatePath("/", "layout");
  redirect(`/archiv/${id}`);
}

export async function outlineToDocumentAction(fd: FormData) {
  await requireUser();
  const id = outlineToDocument(String(fd.get("text") ?? ""), uuid(fd.get("documentId")));
  revalidatePath("/archiv");
  redirect(`/archiv/${id}`);
}

export async function slidesFromRunAction(fd: FormData) {
  await requireUser();
  const id = slidesFromRun(uuid(fd.get("runId")));
  revalidatePath("/praesentationen");
  redirect(`/praesentationen/${id}`);
}

export async function setModelAction(fd: FormData) {
  await requireUser();
  const model = String(fd.get("model") ?? "");
  if (MODELS.some((m) => m.id === model)) setSetting("ai.model", model);
  revalidatePath("/einstellungen");
  revalidatePath("/assistent");
}
