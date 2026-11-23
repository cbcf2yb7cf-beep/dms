import { notFound } from "next/navigation";
import { DeckPlayer } from "@/components/slides/deck-player";
import { getPresentation } from "@/lib/presentations";
import { requireUser } from "@/lib/session";

export const metadata = { title: "Vortrag" };

export default async function PresentPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ folie?: string }> }) {
  await requireUser();
  const p = getPresentation((await params).id);
  if (!p) notFound();
  const start = Math.max(1, Number((await searchParams).folie) || 1) - 1;
  return <DeckPlayer id={p.id} title={p.title} theme={p.theme} slides={p.slides} start={start} />;
}
