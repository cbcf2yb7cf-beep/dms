import { ChevronDown, Plus } from "lucide-react";
import { newDocument } from "@/lib/actions/documents";
import { TYPE_OPTIONS } from "@/lib/doc-meta";

/** "Neue Predigt" + Menü für die anderen Arten. Reine Formulare, kein JS nötig. */
export function NewDocumentMenu() {
  return (
    <div className="flex items-stretch">
      <form action={newDocument}>
        <input type="hidden" name="type" value="predigt" />
        <button type="submit" className="btn-primary rounded-r-none">
          <Plus className="size-4" aria-hidden="true" /> Neue Predigt
        </button>
      </form>
      <details className="relative">
        <summary className="btn-primary cursor-pointer list-none rounded-l-none border-l border-bg/20 px-3 [&::-webkit-details-marker]:hidden" aria-label="Andere Art anlegen">
          <ChevronDown className="size-4" aria-hidden="true" />
        </summary>
        <div className="absolute right-0 z-30 mt-2 w-52 rounded-xl border border-border bg-surface p-1.5 shadow-xl">
          {TYPE_OPTIONS.filter(([t]) => t !== "predigt").map(([type, label]) => (
            <form key={type} action={newDocument}>
              <input type="hidden" name="type" value={type} />
              <button type="submit" className="flex min-h-11 w-full items-center rounded-lg px-3 text-left text-[15px] hover:bg-surface-2">
                {type === "vortrag" ? "Neuer" : "Neue"} {label}
              </button>
            </form>
          ))}
        </div>
      </details>
    </div>
  );
}
