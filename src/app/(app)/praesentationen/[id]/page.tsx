import { notFound } from "next/navigation";
import { PresentationEditor } from "@/components/slides/presentation-editor";
import { getDocument } from "@/lib/documents";
import { getPresentation } from "@/lib/presentations";
import { requireUser } from "@/lib/session";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  return { title: getPresentation((await params).id)?.title || "Präsentation" };
}

export default async function PresentationPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const p = getPresentation((await params).id);
  if (!p) notFound();
  const doc = p.documentId ? getDocument(p.documentId) : undefined;
  return <PresentationEditor key={p.id} initial={{ ...p, document: doc && !doc.deletedAt ? { id: doc.id, title: doc.title } : null }} />;
}
