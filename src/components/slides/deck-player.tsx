"use client";

import { useEffect, useState } from "react";
import type { Slide, ThemeId } from "@/lib/slides/types";
import { SlideView } from "./slide-view";
import { useDeck } from "./use-deck";

/** Vollbild-Vortrag: Folie füllt den Bildschirm (16:9, Rest schwarz). Klick rechts = weiter, links = zurück. */
export function DeckPlayer({ id, title, theme, slides, start }: { id: string; title: string; theme: ThemeId; slides: Slide[]; start: number }) {
  const { index, black, show } = useDeck(id, slides.length, start);
  const [cursor, setCursor] = useState(true);
  const [hint, setHint] = useState(true);

  // Mauszeiger nach 2 s ausblenden, Hinweis nach 4 s
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const move = () => {
      setCursor(true);
      clearTimeout(t);
      t = setTimeout(() => setCursor(false), 2000);
    };
    move();
    window.addEventListener("mousemove", move);
    const h = setTimeout(() => setHint(false), 4000);
    return () => {
      window.removeEventListener("mousemove", move);
      clearTimeout(t);
      clearTimeout(h);
    };
  }, []);

  useEffect(() => {
    document.title = `${title || "Präsentation"} – Folie ${index + 1}`;
  }, [title, index]);

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black"
      style={{ cursor: cursor ? "default" : "none" }}
      onClick={(e) => show(e.clientX < window.innerWidth / 3 ? index - 1 : index + 1)}
    >
      <div style={{ width: "min(100vw, calc(100vh * 16 / 9))" }}>
        <SlideView slide={slides[index]} theme={theme} black={black} />
      </div>
      {hint && (
        <p className="pointer-events-none fixed bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/70 px-4 py-2 text-sm text-white">
          F = Vollbild · ←/→ blättern · B = schwarz · Esc = Vollbild beenden
        </p>
      )}
    </div>
  );
}
