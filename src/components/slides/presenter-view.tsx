"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, MonitorUp, Pause, Play, RotateCcw, Square } from "lucide-react";
import type { Slide, ThemeId } from "@/lib/slides/types";
import { SlideView } from "./slide-view";
import { useDeck } from "./use-deck";

type Bridge = { presentOnDisplay?: (path: string) => Promise<string> };

/** Referentenansicht: aktuelle und nächste Folie, Notizen, Uhr und Stoppuhr. Steuert das Vortragsfenster mit. */
export function PresenterView({ id, title, theme, slides, start }: { id: string; title: string; theme: ThemeId; slides: Slide[]; start: number }) {
  const { index, black, show } = useDeck(id, slides.length, start);
  const [now, setNow] = useState<Date | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [bridge, setBridge] = useState<Bridge | undefined>();

  useEffect(() => setBridge((window as unknown as { dmsDesktop?: Bridge }).dmsDesktop), []);
  useEffect(() => {
    const t = setInterval(() => {
      setNow(new Date());
      if (running) setElapsed((e) => e + 1);
    }, 1000);
    return () => clearInterval(t);
  }, [running]);

  const openAudience = async () => {
    setRunning(true);
    const path = `/vortrag/${id}?folie=${index + 1}`;
    if (bridge?.presentOnDisplay) await bridge.presentOnDisplay(path);
    else window.open(path, "dms-vortrag");
  };
  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");
  const notes = slides[index]?.notes ?? "";

  return (
    <div className="flex min-h-dvh flex-col gap-4 bg-[#141414] p-4 text-[#ececec] sm:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="truncate text-lg font-semibold">{title || "Präsentation"}</h1>
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-mono text-2xl tabular-nums" aria-label="Uhrzeit">{now ? now.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }) : "--:--"}</span>
          <span className="font-mono text-2xl tabular-nums text-[#d4b26a]" aria-label="Vortragsdauer">{mm}:{ss}</span>
          <button type="button" onClick={() => setRunning((r) => !r)} className="inline-flex size-11 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20" aria-label={running ? "Stoppuhr anhalten" : "Stoppuhr starten"}>
            {running ? <Pause className="size-5" aria-hidden="true" /> : <Play className="size-5" aria-hidden="true" />}
          </button>
          <button type="button" onClick={() => setElapsed(0)} className="inline-flex size-11 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20" aria-label="Stoppuhr zurücksetzen">
            <RotateCcw className="size-5" aria-hidden="true" />
          </button>
          <button type="button" onClick={() => void openAudience()} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#d4b26a] px-4 font-semibold text-black">
            <MonitorUp className="size-5" aria-hidden="true" /> {bridge?.presentOnDisplay ? "Auf Beamer zeigen" : "Vortragsfenster öffnen"}
          </button>
        </div>
      </header>

      <div className="grid flex-1 gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section className="flex flex-col gap-2">
          <p className="text-sm text-white/60">Jetzt – Folie {index + 1} von {slides.length}{black ? " (schwarz)" : ""}</p>
          <div className="overflow-hidden rounded-lg ring-2 ring-[#d4b26a]">
            <SlideView slide={slides[index]} theme={theme} black={black} />
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => show(index - 1)} className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-lg bg-white/10 hover:bg-white/20" aria-label="Vorherige Folie">
              <ChevronLeft className="size-6" aria-hidden="true" /> Zurück
            </button>
            <button type="button" onClick={() => show(index, !black)} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-white/10 px-4 hover:bg-white/20" aria-pressed={black} aria-label="Schwarz schalten">
              <Square className="size-5 fill-current" aria-hidden="true" /> B
            </button>
            <button type="button" onClick={() => show(index + 1)} className="inline-flex min-h-12 flex-[2] items-center justify-center gap-2 rounded-lg bg-white/15 hover:bg-white/25" aria-label="Nächste Folie">
              Weiter <ChevronRight className="size-6" aria-hidden="true" />
            </button>
          </div>
        </section>
        <section className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <p className="text-sm text-white/60">Als Nächstes</p>
            <div className="overflow-hidden rounded-lg opacity-90">
              {index + 1 < slides.length ? <SlideView slide={slides[index + 1]} theme={theme} /> : <div className="flex aspect-video items-center justify-center rounded-lg bg-white/5 text-white/50">Ende</div>}
            </div>
          </div>
          <div className="flex flex-1 flex-col gap-2">
            <p className="text-sm text-white/60">Notizen</p>
            <div className="flex-1 overflow-y-auto rounded-lg bg-white/5 p-4 text-[22px] leading-relaxed whitespace-pre-line">{notes || <span className="text-white/40">Keine Notizen zu dieser Folie.</span>}</div>
          </div>
        </section>
      </div>
    </div>
  );
}
