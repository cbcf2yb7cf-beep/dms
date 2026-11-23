"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Send, Sparkles } from "lucide-react";
import { prepareAction, runAction, applySummaryAction, applyTopicsAction, outlineToDocumentAction, slidesFromRunAction, type AssistantState } from "@/lib/actions/ai";
import { formatUsd } from "@/lib/ai/models";
import { SubmitButton } from "@/components/submit-button";
import { DocPicker } from "./doc-picker";
import { MarkdownView } from "./markdown-view";

type TaskInfo = { id: string; label: string; hint: string; docs: number };

export function Assistant({ tasks, initialDoc, configured }: { tasks: TaskInfo[]; initialDoc: { id: string; title: string } | null; configured: boolean }) {
  const [task, setTask] = useState(initialDoc ? "zusammenfassung" : "archivfrage");
  const [prep, prepAction] = useActionState(prepareAction, undefined);
  const [res, sendAction] = useActionState(runAction, undefined);
  const info = tasks.find((t) => t.id === task)!;
  const shownPrep = prep?.prepared && prep.input?.task === task ? prep : undefined;
  const shownRes = res?.result && res.input?.task === task ? res : undefined;

  return (
    <div className="flex flex-col gap-6">
      <fieldset className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <legend className="sr-only">Aufgabe</legend>
        {tasks.map((t) => (
          <label key={t.id} className={`flex cursor-pointer flex-col gap-1 rounded-xl border p-4 ${task === t.id ? "border-accent bg-accent-soft" : "border-border bg-surface hover:border-border-strong"}`}>
            <span className="flex items-center gap-2 font-semibold">
              <input type="radio" name="task-choice" value={t.id} checked={task === t.id} onChange={() => setTask(t.id)} className="accent-[var(--accent)]" />
              {t.label}
            </span>
            <span className="text-sm text-ink-2">{t.hint}</span>
          </label>
        ))}
      </fieldset>

      <form key={task} action={prepAction} className="card flex flex-col gap-4">
        <input type="hidden" name="task" value={task} />
        {task === "archivfrage" ? (
          <div>
            <label htmlFor="q" className="label">Deine Frage</label>
            <textarea id="q" name="question" rows={2} required minLength={3} placeholder="z. B. Was habe ich über Vergebung unter Geschwistern gepredigt?" className="input py-2" />
            <p className="mt-1 text-xs text-muted">DMS sucht zuerst lokal in deinem Archiv. Gesendet werden nur Ausschnitte der passenden Dokumente.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <DocPicker name="documentId" label={info.docs === 2 ? "Erstes Dokument" : "Dokument"} initial={initialDoc} />
            {info.docs === 2 && <DocPicker name="otherId" label="Zweites Dokument" />}
          </div>
        )}
        {prep?.error && !shownPrep && <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger" role="alert">{prep.error}</p>}
        <div>
          <SubmitButton className="btn-secondary"><Sparkles className="size-4" aria-hidden="true" /> Vorbereiten</SubmitButton>
          <span className="ml-3 text-sm text-muted">Noch wird nichts gesendet.</span>
        </div>
      </form>

      {shownPrep?.prepared && (
        <section className="card flex flex-col gap-4 border-accent" aria-label="Vorschau">
          <h2 className="font-serif text-xl font-semibold">Das würde an Claude gesendet</h2>
          {shownPrep.prepared.error ? (
            <p className="text-danger">{shownPrep.prepared.error}</p>
          ) : (
            <form action={sendAction} className="flex flex-col gap-4">
              <input type="hidden" name="task" value={task} />
              <input type="hidden" name="confirm" value="1" />
              {shownPrep.input && "documentId" in shownPrep.input && <input type="hidden" name="documentId" value={shownPrep.input.documentId} />}
              {shownPrep.input && "otherId" in shownPrep.input && <input type="hidden" name="otherId" value={shownPrep.input.otherId} />}
              {shownPrep.input?.task === "archivfrage" && <input type="hidden" name="question" value={shownPrep.input.question} />}

              {shownPrep.prepared.candidates ? (
                <ArchiveSelection candidates={shownPrep.prepared.candidates} preselected={shownPrep.prepared.items.map((i) => i.id)} />
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {shownPrep.prepared.items.map((i) => (
                    <li key={i.id} className="flex flex-wrap justify-between gap-2 text-[15px]">
                      <span className="font-medium">{i.title}</span>
                      <span className="text-muted">{i.detail} · {i.chars.toLocaleString("de-DE")} Zeichen{i.truncated ? " (gekürzt!)" : ""}</span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-sm text-ink-2">
                Modell: <strong>{shownPrep.prepared.modelName}</strong> · ca. {shownPrep.prepared.estInputTokens.toLocaleString("de-DE")} Tokens · geschätzt <strong>{formatUsd(shownPrep.prepared.estCostUsd)}</strong>
              </p>
              <details className="text-sm">
                <summary className="cursor-pointer text-ink-2">Gesamten Text ansehen, der gesendet wird</summary>
                <pre className="mt-2 max-h-80 overflow-auto rounded-lg bg-surface-2 p-3 text-xs whitespace-pre-wrap">{shownPrep.prepared.content}</pre>
              </details>
              {!configured && <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">Noch kein Claude-Schlüssel hinterlegt – siehe <Link href="/einstellungen#assistent">Einstellungen</Link>.</p>}
              <div>
                <SubmitButton className="btn-accent">
                  <Send className="size-4" aria-hidden="true" /> An Claude senden
                </SubmitButton>
                <span className="ml-3 text-sm text-muted">Ergebnisse werden nicht automatisch übernommen.</span>
              </div>
            </form>
          )}
        </section>
      )}

      {shownRes?.result && <Result state={shownRes} />}
      {res?.error && <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger" role="alert">{res.error}</p>}
    </div>
  );
}

function ArchiveSelection({ candidates, preselected }: { candidates: { id: string; title: string; detail: string }[]; preselected: string[] }) {
  const [chosen, setChosen] = useState<string[]>(preselected);
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="mb-1 text-[15px]">Gefundene Dokumente – nur angehakte werden (als Ausschnitte) gesendet:</legend>
      <input type="hidden" name="documentIds" value={chosen.join(",")} />
      {candidates.map((c) => (
        <label key={c.id} className="flex items-start gap-2 text-[15px]">
          <input type="checkbox" checked={chosen.includes(c.id)} onChange={(e) => setChosen(e.target.checked ? [...chosen, c.id].slice(0, 10) : chosen.filter((x) => x !== c.id))} className="mt-1 size-4 accent-[var(--accent)]" />
          <span><span className="font-medium">{c.title}</span> <span className="text-sm text-muted">{c.detail}</span></span>
        </label>
      ))}
    </fieldset>
  );
}

function Result({ state }: { state: AssistantState }) {
  const r = state!.result!;
  const input = state!.input!;
  const docId = "documentId" in input ? input.documentId : "";
  const sources = input.task === "archivfrage" ? r.sources : undefined;
  return (
    <section className="card flex flex-col gap-4" aria-label="Ergebnis">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-serif text-xl font-semibold">{r.status === "ok" ? "Ergebnis" : r.status === "abgelehnt" ? "Abgelehnt" : "Fehler"}</h2>
        <span className="text-sm text-muted">{r.inputTokens.toLocaleString("de-DE")} + {r.outputTokens.toLocaleString("de-DE")} Tokens · {formatUsd(r.costUsd)}</span>
      </div>
      {r.status !== "ok" ? (
        <p className="text-danger">{r.text}</p>
      ) : input.task === "themen" && r.json ? (
        <ThemenResult json={r.json as { themen: string[]; bibelstellen: { stelle: string; grund: string }[]; kurzbeschreibung: string }} documentId={docId} />
      ) : input.task === "folien" && r.json ? (
        <form action={slidesFromRunAction} className="flex flex-wrap items-center gap-3">
          <input type="hidden" name="runId" value={r.runId} />
          <p>{(r.json as { folien: unknown[] }).folien.length} Folien vorgeschlagen.</p>
          <SubmitButton className="btn-accent">Als Präsentation anlegen und bearbeiten</SubmitButton>
        </form>
      ) : (
        <>
          <MarkdownView text={r.text} sources={sources} />
          {sources && sources.length > 0 && (
            <ol className="flex list-decimal flex-col gap-0.5 pl-6 text-sm text-ink-2">
              {sources.map((s) => <li key={s.id}><Link href={`/archiv/${s.id}`}>{s.title}</Link></li>)}
            </ol>
          )}
          {input.task === "zusammenfassung" && (
            <form action={applySummaryAction}>
              <input type="hidden" name="documentId" value={docId} />
              <input type="hidden" name="text" value={r.text} />
              <SubmitButton className="btn-secondary">Als Kurzbeschreibung übernehmen</SubmitButton>
            </form>
          )}
          {input.task === "gliederung" && (
            <form action={outlineToDocumentAction}>
              <input type="hidden" name="documentId" value={docId} />
              <input type="hidden" name="text" value={r.text} />
              <SubmitButton className="btn-secondary">Als neue Notiz speichern</SubmitButton>
            </form>
          )}
        </>
      )}
    </section>
  );
}

function ThemenResult({ json, documentId }: { json: { themen: string[]; bibelstellen: { stelle: string; grund: string }[]; kurzbeschreibung: string }; documentId: string }) {
  return (
    <div className="flex flex-col gap-5">
      <form action={applyTopicsAction} className="flex flex-col gap-2">
        <input type="hidden" name="documentId" value={documentId} />
        <p className="font-semibold">Themen</p>
        <div className="flex flex-wrap gap-2">
          {json.themen.map((t) => (
            <label key={t} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-border bg-surface px-3 text-[15px]">
              <input type="checkbox" name="topic" value={t} defaultChecked className="size-4 accent-[var(--accent)]" /> {t}
            </label>
          ))}
        </div>
        <div><SubmitButton className="btn-secondary">Ausgewählte Themen hinzufügen</SubmitButton></div>
      </form>
      {json.bibelstellen.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="font-semibold">Weitere Bibelstellen</p>
          <ul className="flex flex-col gap-1.5 text-[15px]">
            {json.bibelstellen.map((b) => (
              <li key={b.stelle}>
                <Link href={`/bibel?stelle=${encodeURIComponent(b.stelle)}`} className="font-semibold">{b.stelle}</Link> <span className="text-ink-2">– {b.grund}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {json.kurzbeschreibung && (
        <form action={applySummaryAction} className="flex flex-col gap-2">
          <p className="font-semibold">Kurzbeschreibung</p>
          <p className="text-ink-2">{json.kurzbeschreibung}</p>
          <input type="hidden" name="documentId" value={documentId} />
          <input type="hidden" name="text" value={json.kurzbeschreibung} />
          <div><SubmitButton className="btn-secondary">Übernehmen</SubmitButton></div>
        </form>
      )}
    </div>
  );
}
