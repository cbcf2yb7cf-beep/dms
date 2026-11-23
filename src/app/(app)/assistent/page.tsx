import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Assistant } from "@/components/ai/assistant";
import { aiConfigured } from "@/lib/ai/client";
import { formatUsd, modelInfo } from "@/lib/ai/models";
import { currentModel, recentRuns, TASKS, totalCost } from "@/lib/ai/tasks";
import { getDocument } from "@/lib/documents";
import { formatDateTime } from "@/lib/format";
import { requireUser } from "@/lib/session";

export const metadata = { title: "Assistent" };

export default async function AssistantPage({ searchParams }: { searchParams: Promise<{ dok?: string }> }) {
  await requireUser();
  const dokId = (await searchParams).dok;
  const doc = dokId ? getDocument(dokId) : undefined;
  const configured = aiConfigured();
  const runs = recentRuns(20);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-7 px-5 py-8 sm:px-10 sm:py-10">
      <PageHeader title="Assistent" />
      <p className="max-w-3xl text-ink-2">
        Claude hilft beim Zusammenfassen, Gliedern, Vergleichen und Recherchieren in deinem Archiv. Du siehst vor jedem Aufruf genau, welche Texte gesendet werden.
        Modell: <strong>{modelInfo(currentModel()).name}</strong> (<Link href="/einstellungen#assistent">ändern</Link>) · bisher insgesamt {formatUsd(totalCost())}.
      </p>
      {!configured && (
        <p className="rounded-xl border border-border-strong bg-accent-soft px-4 py-3 text-[15px]">
          Noch kein Claude-Schlüssel hinterlegt. Unter <Link href="/einstellungen#assistent">Einstellungen → Assistent</Link> eintragen – „Vorbereiten“ funktioniert auch ohne.
        </p>
      )}
      <Assistant tasks={Object.entries(TASKS).map(([id, t]) => ({ id, label: t.label, hint: t.hint, docs: t.docs }))} initialDoc={doc && !doc.deletedAt ? { id: doc.id, title: doc.title || "Ohne Titel" } : null} configured={configured} />

      {runs.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="eyebrow">Verlauf</h2>
          <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
            {runs.map((r) => (
              <li key={r.id}>
                <details className="px-5 py-3">
                  <summary className="flex cursor-pointer flex-wrap items-baseline justify-between gap-2">
                    <span className="font-medium">{TASKS[r.task as keyof typeof TASKS]?.label ?? r.task}{r.question ? `: ${r.question}` : ""}</span>
                    <span className="text-sm text-muted">{formatDateTime(r.createdAt)} · {modelInfo(r.model).name} · {formatUsd(r.costUsd)}{r.status !== "ok" ? ` · ${r.status}` : ""}</span>
                  </summary>
                  <pre className="mt-2 max-h-80 overflow-auto font-sans text-sm whitespace-pre-wrap text-ink-2">{r.result}</pre>
                </details>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
