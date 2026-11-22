import { notFound } from "next/navigation";
import { DocumentEditor } from "@/components/editor/document-editor";
import { facets, getDocument } from "@/lib/documents";
import { requireUser } from "@/lib/session";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const doc = getDocument((await params).id);
  return { title: doc?.title || "Ohne Titel" };
}

export default async function DocumentPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const doc = getDocument((await params).id);
  if (!doc || doc.deletedAt) notFound();
  const f = facets();

  return (
    <DocumentEditor
      key={doc.id}
      doc={{
        id: doc.id,
        title: doc.title,
        contentJson: doc.contentJson,
        type: doc.type,
        status: doc.status,
        heldOn: doc.heldOn,
        occasion: doc.occasion,
        place: doc.place,
        series: doc.series,
        mainRef: doc.mainRef,
        summary: doc.summary,
        favorite: doc.favorite,
        archived: Boolean(doc.archivedAt),
        topics: doc.topics,
        tags: doc.tags,
        refs: doc.refs.map((r) => ({ label: r.label, source: r.source })),
        updatedAt: doc.updatedAt.getTime(),
      }}
      facets={{ topics: f.topics, tags: f.tags, series: f.series, occasions: f.occasions, places: f.places }}
    />
  );
}
