"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="btn-accent min-h-10 px-3 text-sm">
      <Printer className="size-4" aria-hidden="true" /> Drucken / als PDF sichern
    </button>
  );
}
