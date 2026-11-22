"use client";

import { Search } from "lucide-react";
import { openSearch } from "./command-palette";

export function DashboardSearch() {
  return (
    <button
      type="button"
      onClick={openSearch}
      className="flex min-h-16 w-full items-center gap-4 rounded-2xl border border-border bg-surface px-5 text-left shadow-[0_1px_2px_rgba(42,37,32,0.05)] hover:border-border-strong"
    >
      <Search className="size-5 shrink-0 text-muted" aria-hidden="true" />
      <span className="flex-1 text-[17px] text-muted">Thema, Bibelstelle oder Wort suchen – z. B. „Vergebung“ oder „Röm 8“</span>
      <kbd className="hidden rounded-md border border-border px-2 py-1 text-xs text-muted sm:inline">⌘ K</kbd>
    </button>
  );
}
