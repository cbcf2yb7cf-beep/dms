import { notFound } from "next/navigation";
import { PresenterView } from "@/components/slides/presenter-view";
import { getPresentation } from "@/lib/presentations";
import { requireUser } from "@/lib/session";

export const metadata = { title: "Referentenansicht" };

export default async function PresenterPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ folie?: string }> }) {
  await requireUser();
  const p = getPresentation((await params).id);
  if (!p) notFound();
  const start = Math.max(1, Number((await searchParams).folie) || 1) - 1;
  return <PresenterView id={p.id} title={p.title} theme={p.theme} slides={p.slides} start={start} />;
}
