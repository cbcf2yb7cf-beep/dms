import { notFound } from "next/navigation";
import { SlideView } from "@/components/slides/slide-view";
import { PrintButton } from "@/components/slides/print-button";
import { getPresentation } from "@/lib/presentations";
import { requireUser } from "@/lib/session";

export const metadata = { title: "Drucken" };

/** Jede Folie eine Seite (16:9 quer) – über „Drucken“ → „Als PDF sichern“. */
export default async function PrintPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const p = getPresentation((await params).id);
  if (!p) notFound();
  return (
    <div className="bg-neutral-300 print:bg-white">
      <style>{`@page { size: 13.333in 7.5in; margin: 0 } @media print { .slide-page { break-after: page; width: 13.333in; } }`}</style>
      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 bg-ink px-5 py-3 text-bg print:hidden">
        <span>{p.title || "Präsentation"} – {p.slides.length} Folien</span>
        <PrintButton />
      </div>
      <div className="mx-auto flex max-w-5xl flex-col gap-6 p-6 print:block print:max-w-none print:p-0">
        {p.slides.map((s) => (
          <div key={s.id} className="slide-page shadow-lg print:shadow-none" style={{ printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" }}>
            <SlideView slide={s} theme={p.theme} />
          </div>
        ))}
      </div>
    </div>
  );
}
